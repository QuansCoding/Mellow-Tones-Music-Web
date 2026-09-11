"""Play counting and the public, read-only views built on it.

Every read here is open to anonymous callers: the home page, Discover, artist
pages and public playlists are browsable signed out, just like the catalogue.
Private playlists are only ever returned to their owner.

Recording a play is the exception — it needs an account. Signed-out visitors
can listen, but their listening does not move any chart.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..genres import GENRES, clean_genre
from ..models import (
    Artist, FavoriteArtist, LikedSong, PlayEvent, Playlist, PlaylistSong, Song,
    User,
)
from ..plays import song_play_counts, songs_out
from ..schemas import (
    ArtistDetailOut, ArtistStatOut, DiscoverOut, GenreOut, HomeOut,
    PlayCreate, PlayResult, PublicPlaylistOut,
)
from ..security import get_current_user, get_current_user_optional

router = APIRouter(tags=["discover"])

TRENDING_SIZE = 5       # rows in the Trending table
ARTISTS_SIZE = 5        # one row of wide artist tiles
PLAYLISTS_SIZE = 7      # one row of small playlist tiles

WINDOW = timedelta(hours=24)
# One listener replaying one song only counts once per this long. The client
# already requires 30s of real listening per play; this stops a loop (or a
# script) turning one person into a chart position.
COOLDOWN = timedelta(minutes=10)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------
# Ranking
# --------------------------------------------------------------------------

def _top(db: Session, key, since: datetime | None, limit: int, *,
         join=None, where=()) -> list[tuple[uuid.UUID, int]]:
    """(id, plays) for the most-played `key`, best first.

    Ties go to whatever was played most recently, then to the id, so the
    order is stable between requests instead of shuffling on every reload.
    """
    plays = func.count(PlayEvent.id)
    query = select(key, plays).select_from(PlayEvent)
    if join is not None:
        query = query.join(*join)
    if since is not None:
        query = query.where(PlayEvent.played_at >= since)
    query = (
        query.where(key.is_not(None), *where)
        .group_by(key)
        .order_by(plays.desc(), func.max(PlayEvent.played_at).desc(), key)
        .limit(limit)
    )
    return [(k, n) for k, n in db.execute(query).all()]


def _pick(db: Session, key, limit: int, **kw):
    """Rank by the last 24 hours when that can fill the section, else all time.

    "Today" wins whenever it has as many entries as all time does — i.e. it
    is only abandoned when a quiet day would leave the section visibly
    shorter than it needs to be. With no plays at all the caller falls back
    to newest-first, which is labelled as such rather than passed off as a
    ranking.
    """
    ever = _top(db, key, None, limit, **kw)
    if not ever:
        return [], "new"
    today = _top(db, key, _now() - WINDOW, limit, **kw)
    if len(today) >= len(ever):
        return today, "day"
    return ever, "all"


def _in_order(db: Session, model, ids: list[uuid.UUID]):
    """Load rows by id, keeping the ranking's order."""
    if not ids:
        return []
    rows = {r.id: r for r in db.scalars(select(model).where(model.id.in_(ids))).all()}
    return [rows[i] for i in ids if i in rows]


def _artists_out(db: Session, artists: list[Artist],
                 window: dict | None = None) -> list[ArtistStatOut]:
    ids = [a.id for a in artists]
    if not ids:
        return []
    song_counts = dict(db.execute(
        select(Song.artist_id, func.count(Song.id))
        .where(Song.artist_id.in_(ids))
        .group_by(Song.artist_id)
    ).all())
    play_counts = dict(db.execute(
        select(Song.artist_id, func.count(PlayEvent.id))
        .join(PlayEvent, PlayEvent.song_id == Song.id)
        .where(Song.artist_id.in_(ids))
        .group_by(Song.artist_id)
    ).all())
    return [
        ArtistStatOut(
            id=a.id,
            name=a.name,
            song_count=song_counts.get(a.id, 0),
            play_count=play_counts.get(a.id, 0),
            window_plays=None if window is None else window.get(a.id, 0),
        )
        for a in artists
    ]


def _playlists_out(db: Session, playlists: list[Playlist],
                   window: dict | None = None) -> list[PublicPlaylistOut]:
    ids = [p.id for p in playlists]
    if not ids:
        return []
    play_counts = dict(db.execute(
        select(PlayEvent.playlist_id, func.count(PlayEvent.id))
        .where(PlayEvent.playlist_id.in_(ids))
        .group_by(PlayEvent.playlist_id)
    ).all())
    return [
        PublicPlaylistOut(
            id=p.id,
            name=p.name,
            owner=p.user.username,
            is_public=p.is_public,
            song_ids=[e.song_id for e in p.entries],
            play_count=play_counts.get(p.id, 0),
            window_plays=None if window is None else window.get(p.id, 0),
        )
        for p in playlists
    ]


# --------------------------------------------------------------------------
# Plays
# --------------------------------------------------------------------------

@router.post("/plays", response_model=PlayResult)
def record_play(
    body: PlayCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Count one signed-in listen. The client calls this after 30s of actual
    playback, and never while signed out (this would 401).

    Returns whether it counted: a replay inside the cooldown is accepted
    (the client did nothing wrong) but not recorded.
    """
    song = db.get(Song, body.song_id)
    if song is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Song not found")

    listener_key = f"u:{user.id}"
    now = _now()
    recent = db.scalar(
        select(PlayEvent.id).where(
            PlayEvent.listener_key == listener_key,
            PlayEvent.song_id == song.id,
            PlayEvent.played_at >= now - COOLDOWN,
        ).limit(1)
    )
    if recent is not None:
        return PlayResult(counted=False)

    # Only credit a playlist the caller could actually have been listening
    # to, and only if it holds this song — otherwise any request could pump
    # an arbitrary playlist up the home page by naming its id.
    playlist_id = None
    if body.playlist_id is not None:
        playlist = db.get(Playlist, body.playlist_id)
        visible = playlist is not None and (
            playlist.is_public or (user is not None and playlist.user_id == user.id)
        )
        if visible and db.get(PlaylistSong, {"playlist_id": playlist.id,
                                             "song_id": song.id}):
            playlist_id = playlist.id

    db.add(PlayEvent(
        song_id=song.id,
        user_id=user.id if user is not None else None,
        playlist_id=playlist_id,
        listener_key=listener_key,
        played_at=now,
    ))
    db.commit()
    return PlayResult(counted=True)


# --------------------------------------------------------------------------
# Home
# --------------------------------------------------------------------------

@router.get("/home", response_model=HomeOut)
def home(db: Session = Depends(get_db)):
    # --- Trending songs ---------------------------------------------------
    ranked, trending_window = _pick(db, PlayEvent.song_id, TRENDING_SIZE)
    if ranked:
        songs = _in_order(db, Song, [k for k, _ in ranked])
        window = dict(ranked)
    else:
        songs = db.scalars(
            select(Song).order_by(Song.created_at.desc(), Song.id)
            .limit(TRENDING_SIZE)
        ).all()
        window = None
    trending = songs_out(songs, song_play_counts(db, [s.id for s in songs]), window)

    # --- Popular artists --------------------------------------------------
    ranked, artists_window = _pick(
        db, Song.artist_id, ARTISTS_SIZE,
        join=(Song, Song.id == PlayEvent.song_id),
    )
    if ranked:
        artists = _in_order(db, Artist, [k for k, _ in ranked])
        window = dict(ranked)
    else:
        # Nothing played yet: the artists with the most songs, so the row
        # still leads somewhere real.
        song_count = func.count(Song.id)
        artists = db.scalars(
            select(Artist)
            .join(Song, Song.artist_id == Artist.id)
            .group_by(Artist.id)
            .order_by(song_count.desc(), func.lower(Artist.name), Artist.id)
            .limit(ARTISTS_SIZE)
        ).all()
        window = None
    popular_artists = _artists_out(db, artists, window)

    # --- Top public playlists ---------------------------------------------
    ranked, playlists_window = _pick(
        db, PlayEvent.playlist_id, PLAYLISTS_SIZE,
        join=(Playlist, Playlist.id == PlayEvent.playlist_id),
        where=(Playlist.is_public.is_(True),),
    )
    window = dict(ranked) if ranked else None
    # An emptied playlist would be a tile that plays nothing.
    playlists = [p for p in _in_order(db, Playlist, [k for k, _ in ranked]) if p.entries]

    # Unlike songs and artists, someone else's public playlist cannot be
    # found through search — the home page is its only way to be seen. So a
    # short ranking is topped up with the most recently shared ones; ranking
    # alone would mean a newly public playlist can never get its first play.
    if len(playlists) < PLAYLISTS_SIZE:
        taken = {p.id for p in playlists}
        fresh = db.scalars(
            select(Playlist)
            .where(Playlist.is_public.is_(True), Playlist.entries.any())
            .order_by(Playlist.updated_at.desc(), Playlist.id)
            .limit(PLAYLISTS_SIZE * 2)
        ).all()
        playlists += [p for p in fresh if p.id not in taken][:PLAYLISTS_SIZE - len(playlists)]

    return HomeOut(
        trending=trending,
        trending_window=trending_window,
        artists=popular_artists,
        artists_window=artists_window,
        playlists=_playlists_out(db, playlists, window),
        playlists_window=playlists_window,
    )


# --------------------------------------------------------------------------
# Artist + public playlist pages
# --------------------------------------------------------------------------

@router.get("/artists/{artist_id}", response_model=ArtistDetailOut)
def get_artist(artist_id: uuid.UUID, db: Session = Depends(get_db)):
    artist = db.get(Artist, artist_id)
    if artist is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Artist not found")

    songs = db.scalars(select(Song).where(Song.artist_id == artist.id)).all()
    counts = song_play_counts(db, [s.id for s in songs])
    # Their most-played first, the way an artist page is read.
    songs = sorted(songs, key=lambda s: (-counts.get(s.id, 0), s.title.lower()))

    return ArtistDetailOut(
        id=artist.id,
        name=artist.name,
        song_count=len(songs),
        play_count=sum(counts.values()),
        songs=songs_out(songs, counts),
    )


@router.get("/playlists/{playlist_id}", response_model=PublicPlaylistOut)
def get_playlist(
    playlist_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    """A public playlist, or your own. 404 — not 403 — for someone else's
    private one, so the response never confirms that it exists."""
    playlist = db.get(Playlist, playlist_id)
    if playlist is None or not (
        playlist.is_public or (user is not None and playlist.user_id == user.id)
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Playlist not found")
    return _playlists_out(db, [playlist])[0]


# --------------------------------------------------------------------------
# Genres + Discover
# --------------------------------------------------------------------------

DISCOVER_SONGS = 12      # per section
DISCOVER_ARTISTS = 8


@router.get("/genres", response_model=list[GenreOut])
def list_genres():
    """The fixed genre list, in display order. Served rather than copied into
    the client, so the upload form, the edit form and the Discover filter can
    never drift from what the server accepts."""
    return [GenreOut(id=key, label=label) for key, label in GENRES.items()]


@router.get("/discover", response_model=DiscoverOut)
def discover(
    genre: str | None = Query(None, max_length=40),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    """Music the listener has not settled on yet.

    Home is what everyone is playing; Discover is what *you* have not heard.
    The rules:

      - a signed-in listener's liked songs never appear — they already have
        a home in the library;
      - "for you" is songs they have never played, artists they favour first
        (the nearest thing to taste until genres fill in), then newest. Once
        everything has been heard it becomes what they have played least,
        and `all_heard` tells the page to say so;
      - each song appears in one section only, the first that wants it, so a
        small catalogue does not repeat the same three tracks down the page.

    `genre` already narrows every section, so the filter row can be added to
    the page later without changing this endpoint.

    Ranking happens in Python over the (optionally genre-filtered) catalogue.
    That is fine into the low thousands of songs; beyond that, move the
    ordering into SQL.
    """
    genre = clean_genre(genre)
    query = select(Song)
    if genre is not None:
        query = query.where(Song.genre == genre)
    songs = db.scalars(query).all()
    counts = song_play_counts(db, [s.id for s in songs])

    liked: set[uuid.UUID] = set()
    heard: dict[uuid.UUID, int] = {}
    favourites: set[uuid.UUID] = set()
    if user is not None:
        liked = set(db.scalars(
            select(LikedSong.song_id).where(LikedSong.user_id == user.id)
        ).all())
        heard = dict(db.execute(
            select(PlayEvent.song_id, func.count(PlayEvent.id))
            .where(PlayEvent.user_id == user.id)
            .group_by(PlayEvent.song_id)
        ).all())
        favourites = set(db.scalars(
            select(FavoriteArtist.artist_id).where(FavoriteArtist.user_id == user.id)
        ).all())

    pool = [s for s in songs if s.id not in liked]
    taken: set[uuid.UUID] = set()

    def take(ordered):
        picked = []
        for song in ordered:
            if song.id in taken:
                continue
            taken.add(song.id)
            picked.append(song)
            if len(picked) == DISCOVER_SONGS:
                break
        return picked

    def newest(song):
        return -song.created_at.timestamp()

    for_you, all_heard = [], False
    if user is not None:
        unheard = [s for s in pool if s.id not in heard]
        if unheard:
            for_you = take(sorted(
                unheard, key=lambda s: (s.artist_id not in favourites, newest(s))))
        elif pool:
            all_heard = True
            for_you = take(sorted(pool, key=lambda s: (heard.get(s.id, 0), newest(s))))

    fresh = take(sorted(pool, key=newest))
    under_radar = take(sorted(pool, key=lambda s: (counts.get(s.id, 0), newest(s))))

    # Artists to try: not already favourited, ones you have never played
    # first. Only artists with a song in scope, so every tile has something
    # to open.
    heard_artists = {s.artist_id for s in songs if s.id in heard}
    candidate_ids = list(dict.fromkeys(
        s.artist_id for s in songs if s.artist_id not in favourites))
    artists = sorted(
        _in_order(db, Artist, candidate_ids),
        key=lambda a: (a.id in heard_artists, a.name.lower()),
    )[:DISCOVER_ARTISTS]

    return DiscoverOut(
        signed_in=user is not None,
        all_heard=all_heard,
        genre=genre,
        for_you=songs_out(for_you, counts),
        fresh=songs_out(fresh, counts),
        under_radar=songs_out(under_radar, counts),
        artists=_artists_out(db, artists),
    )
