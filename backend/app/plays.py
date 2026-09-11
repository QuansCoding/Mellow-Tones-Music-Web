"""Play-count helpers shared by the catalogue, the home page and artist pages."""
import uuid
from collections.abc import Iterable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import PlayEvent, Song
from .schemas import SongOut


def song_play_counts(
    db: Session, song_ids: list[uuid.UUID] | None = None,
) -> dict[uuid.UUID, int]:
    """All-time plays per song. Pass ids to count only those songs."""
    query = (
        select(PlayEvent.song_id, func.count(PlayEvent.id))
        .group_by(PlayEvent.song_id)
    )
    if song_ids is not None:
        if not song_ids:
            return {}
        query = query.where(PlayEvent.song_id.in_(song_ids))
    return {song_id: n for song_id, n in db.execute(query).all()}


def songs_out(
    songs: Iterable[Song],
    counts: dict[uuid.UUID, int],
    window: dict[uuid.UUID, int] | None = None,
) -> list[SongOut]:
    """Serialise songs with their play counts attached.

    A song missing from `counts` has simply never been played, so it gets 0
    here — unlike SongOut's default of None, which means "not counted".
    """
    out = []
    for song in songs:
        update = {"play_count": counts.get(song.id, 0)}
        if window is not None:
            update["window_plays"] = window.get(song.id, 0)
        out.append(SongOut.model_validate(song).model_copy(update=update))
    return out
