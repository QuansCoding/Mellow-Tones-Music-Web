"""Housekeeping: delete rows nothing will ever use again.

Two different jobs are easy to confuse, so they are kept apart:

  * *Releasing* a username or email happens the moment someone else wants it
    (see `_release_if_abandoned` in router/auth.py). Lazy is right there.
  * *Removing junk* has to happen on its own, or an abandoned sign-up sits in
    `users` forever, holding an email address nobody ever confirmed.

This module is the second job. It runs opportunistically from sign-up and
sign-in rather than on a schedule, because free hosting tiers have no cron —
see `maybe_sweep`.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, exists, func, select
from sqlalchemy.orm import Session

from .models import Artist, EmailVerification, Song, User

# How long a sign-up may sit unverified, measured from the last code we sent
# rather than from sign-up, so somebody still asking for codes is never cut
# off mid-attempt.
UNVERIFIED_TTL = timedelta(hours=1)
# A new artist row exists for a moment before the song that needs it is
# committed. Never touch rows younger than this, or a sweep could delete an
# artist out from under an upload still in flight.
NEW_ROW_GRACE = timedelta(hours=1)
# At most one sweep this often, however busy sign-up gets.
SWEEP_EVERY = timedelta(minutes=10)

log = logging.getLogger(__name__)

# Per process, and deliberately not in the database: two instances sweeping
# the same hour is harmless, because every delete below is idempotent.
_last_sweep: datetime | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def is_abandoned(user: User, verification: EmailVerification | None,
                 now: datetime | None = None) -> bool:
    """Unverified, with no sign of life for UNVERIFIED_TTL."""
    if user.email_verified_at is not None:
        return False
    last_activity = user.created_at
    if verification is not None and verification.sent_at > last_activity:
        last_activity = verification.sent_at
    return last_activity < (now or _now()) - UNVERIFIED_TTL


def sweep(db: Session) -> dict[str, int]:
    """Delete abandoned sign-ups, stale codes and songless artists.

    Returns what was removed. Commits.
    """
    now = _now()
    cutoff = now - UNVERIFIED_TTL

    # The later of "signed up" and "last code sent". The outer join keeps
    # accounts whose code row has already gone: they fall back to created_at.
    last_activity = func.greatest(
        User.created_at,
        func.coalesce(EmailVerification.sent_at, User.created_at),
    )
    abandoned = (
        select(User.id)
        .outerjoin(EmailVerification, EmailVerification.user_id == User.id)
        .where(User.email_verified_at.is_(None), last_activity < cutoff)
    )
    # Their likes, playlists and code row go with them (ON DELETE CASCADE);
    # their play events are kept but anonymised (ON DELETE SET NULL). An
    # unverified account can never have uploaded a song, so no file is
    # orphaned by this.
    users = db.execute(
        delete(User).where(User.id.in_(abandoned)).returning(User.id),
        execution_options={"synchronize_session": False},
    ).scalars().all()

    # Codes far past their expiry whose user somehow survived the delete
    # above — a safety net, not the main path.
    codes = db.execute(
        delete(EmailVerification)
        .where(EmailVerification.expires_at < cutoff)
        .returning(EmailVerification.user_id),
        execution_options={"synchronize_session": False},
    ).scalars().all()

    # Artists left behind when their last song was deleted or re-attributed.
    # They are already hidden from search and Home; this stops them
    # accumulating. Anyone who had favourited one loses that favourite
    # (ON DELETE CASCADE), which is the point: there is nothing to listen to.
    songless = db.execute(
        delete(Artist)
        .where(
            Artist.created_at < now - NEW_ROW_GRACE,
            ~exists(select(Song.id).where(Song.artist_id == Artist.id)),
        )
        .returning(Artist.id),
        execution_options={"synchronize_session": False},
    ).scalars().all()

    db.commit()

    counts = {"unverified accounts": len(users), "stale codes": len(codes),
              "songless artists": len(songless)}
    if any(counts.values()):
        log.info("Cleanup removed %s",
                 ", ".join(f"{n} {what}" for what, n in counts.items() if n))
    return counts


def maybe_sweep(db: Session) -> None:
    """Sweep, but at most once every SWEEP_EVERY.

    Call this at the *start* of a request, before it has changes of its own
    pending: the sweep commits, and it must not carry half a request with it.
    Housekeeping must never turn a working request into an error, so any
    failure is logged and swallowed.
    """
    global _last_sweep
    now = _now()
    if _last_sweep is not None and now - _last_sweep < SWEEP_EVERY:
        return
    _last_sweep = now           # set first: a failing sweep must not retry every call
    try:
        sweep(db)
    except Exception:
        db.rollback()
        log.exception("Cleanup sweep failed")
