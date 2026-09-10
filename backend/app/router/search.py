"""Mixed search across songs, artists and the caller's own playlists.

Open to anonymous callers: songs and artists are a shared catalogue. Playlists
are private, so they are only ever searched within the caller's own rows and
are simply absent when nobody is signed in — a signed-out search can never
surface someone else's playlist.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, case, cast, func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Artist, Playlist, Song, User
from ..schemas import ArtistOut, PlaylistOut, SearchOut, SongOut
from ..security import get_current_user_optional

router = APIRouter(tags=["search"])


def _like(term: str) -> str:
    """Wrap a user term for ILIKE, neutralising its wildcards.

    Without this, typing "%" matches the entire catalogue and "_" matches any
    character — the user's literal text has to stay literal.
    """
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _prefix(term: str) -> str:
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"{escaped}%"


@router.get("/search", response_model=SearchOut)
def search(
    q: str = Query("", max_length=100),
    limit: int = Query(6, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    term = q.strip()
    if not term:
        return SearchOut(songs=[], artists=[], playlists=[])

    like, prefix = _like(term), _prefix(term)

    # Relevance, best first: a title that starts with the term beats one that
    # merely contains it, which beats a match on the artist's name. Without an
    # explicit ordering the "best" result is whatever Postgres returns first.
    song_rank = case(
        (Song.title.ilike(prefix, escape="\\"), 0),
        (Artist.name.ilike(prefix, escape="\\"), 1),
        (Song.title.ilike(like, escape="\\"), 2),
        else_=3,
    )

    songs = db.scalars(
        select(Song)
        .join(Artist, Song.artist_id == Artist.id)
        .where(
            or_(
                Song.title.ilike(like, escape="\\"),
                Artist.name.ilike(like, escape="\\"),
            )
        )
        .order_by(song_rank, func.lower(Song.title))
        .limit(limit)
    ).all()

    artists = db.scalars(
        select(Artist)
        .where(Artist.name.ilike(like, escape="\\"))
        .order_by(
            case((Artist.name.ilike(prefix, escape="\\"), 0), else_=1),
            func.lower(Artist.name),
        )
        .limit(limit)
    ).all()

    playlists = []
    if user is not None:
        rows = db.scalars(
            select(Playlist)
            .where(
                Playlist.user_id == user.id,
                Playlist.name.ilike(like, escape="\\"),
            )
            .order_by(
                case((Playlist.name.ilike(prefix, escape="\\"), 0), else_=1),
                func.lower(Playlist.name),
            )
            .limit(limit)
        ).all()
        playlists = [
            PlaylistOut(
                id=p.id,
                name=p.name,
                created_at=p.created_at,
                song_ids=[e.song_id for e in p.entries],
            )
            for p in rows
        ]

    return SearchOut(
        songs=[SongOut.model_validate(s) for s in songs],
        artists=[ArtistOut.model_validate(a) for a in artists],
        playlists=playlists,
    )
