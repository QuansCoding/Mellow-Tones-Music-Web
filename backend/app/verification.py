"""Six-digit email codes: sending, re-sending and checking them.

The limits are what make a 6-digit code safe:
  - it expires after CODE_TTL;
  - MAX_ATTEMPTS wrong guesses kill it (then a new one must be requested);
  - a new code can only be sent every RESEND_COOLDOWN, which also stops
    anyone using "Resend" to flood an inbox or burn the email quota.
"""
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .mailer import EmailSendError, send_verification_code
from .models import EmailVerification, User
from .security import SECRET_KEY

CODE_TTL = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_ATTEMPTS = 5


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash(user_id: uuid.UUID, code: str) -> str:
    # Keyed with SECRET_KEY. There are only a million 6-digit codes, so a
    # plain hash could be reversed by hashing all of them; without the key,
    # a leaked database is no help.
    message = f"{user_id}:{code}".encode()
    return hmac.new(SECRET_KEY.encode(), message, hashlib.sha256).hexdigest()


def seconds_until_resend(row: EmailVerification | None) -> int:
    """How long before another code may be sent (0 = now)."""
    if row is None:
        return 0
    remaining = (row.sent_at + RESEND_COOLDOWN - _now()).total_seconds()
    return max(0, int(remaining + 0.999))          # round up: never say 0 early


def _is_live(row: EmailVerification | None) -> bool:
    return (row is not None and row.expires_at > _now()
            and row.attempts < MAX_ATTEMPTS)


def send_code(db: Session, user: User) -> None:
    """Replace the user's code with a new one and email it.

    429 while the cooldown runs; 503 if the email couldn't be sent.
    """
    row = db.get(EmailVerification, user.id)
    wait = seconds_until_resend(row)
    if wait:
        raise HTTPException(
            429, f"Please wait {wait} seconds before requesting another code.",
            headers={"Retry-After": str(wait)})

    code = f"{secrets.randbelow(1_000_000):06d}"
    if row is None:
        row = EmailVerification(user_id=user.id)
        db.add(row)
    now = _now()
    row.code_hash = _hash(user.id, code)
    row.expires_at = now + CODE_TTL
    row.attempts = 0
    row.sent_at = now
    # Saved before sending, so the code already exists when the email lands.
    db.commit()

    try:
        send_verification_code(user.email, code,
                               int(CODE_TTL.total_seconds() // 60))
    except EmailSendError:
        # Nothing was delivered. Drop the row so the cooldown doesn't block
        # an immediate retry.
        db.delete(row)
        db.commit()
        raise HTTPException(
            503, "We couldn't send the verification email. Please try again "
                 "in a moment.")


def ensure_code(db: Session, user: User) -> bool:
    """Make sure a usable code is out there, without replacing one the user
    may be about to type. Returns whether one is.

    Used at sign-in, where a failure to send shouldn't block the response:
    the verify screen has its own Resend button.
    """
    if _is_live(db.get(EmailVerification, user.id)):
        return True
    try:
        send_code(db, user)
    except HTTPException:
        return False
    return True


def check_code(db: Session, user: User, code: str) -> None:
    """Mark the user verified if `code` is right; otherwise raise 400."""
    # FOR UPDATE: two guesses sent at once can't both read the same attempt
    # count and sneak past the limit.
    row = db.get(EmailVerification, user.id, with_for_update=True)
    if not _is_live(row):
        db.rollback()
        raise HTTPException(400, "This code has expired. Request a new one.")

    row.attempts += 1
    if not hmac.compare_digest(row.code_hash, _hash(user.id, code)):
        db.commit()
        left = MAX_ATTEMPTS - row.attempts
        raise HTTPException(
            400, f"That code isn't right. {left} attempt{'s' if left != 1 else ''} left."
            if left else "Too many wrong codes. Request a new one.")

    user.email_verified_at = _now()
    db.delete(row)
    db.commit()
