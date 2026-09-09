"""The signed-in user's library: liked songs, favourite artists, playlists.

Every route here derives the owner from `get_current_user`, i.e. from the
bearer token, and never from a path, query or body parameter. That is the whole
security model: if a client could name the user whose library it is touching,
any account could read and edit any other account's library (IDOR).

Writes are idempotent (PUT/DELETE rather than POST) so a double-click cannot
409 or create duplicates.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Artist, FavoriteArtist, LikedSong, Playlist, PlaylistSong, Song, User,
)
from ..schemas import (
    ArtistOut, LibraryOut, PlaylistCreate, PlaylistOut, PlaylistUpdate,
)
from ..security import get_current_user

router = APIRouter(prefix="/me", tags=["library"])


def _no_content() -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _playlist_out(playlist: Playlist) -> PlaylistOut:
    return PlaylistOut(
        id=playlist.id,
        name=playlist.name,
        created_at=playlist.created_at,
        song_ids=[e.song_id for e in playlist.entries],
    )


def _owned_playlist(playlist_id: uuid.UUID, user: User, db: Session) -> Playlist:
    """Fetch a playlist belonging to `user`.

    Returns 404, not 403, for a playlist owned by someone else. A 403 would
    confirm the id exists, which leaks the shape of other people's data.
    """
    playlist = db.get(Playlist, playlist_id)
    if playlist is None or playlist.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Playlist not found")
    return playlist


# --------------------------------------------------------------------------
# Aggregate read
# --------------------------------------------------------------------------

@router.get("/library", response_model=LibraryOut)
def get_library(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """One round trip to hydrate the whole client, instead of three."""
    liked = db.scalars(
        select(LikedSong.song_id).where(LikedSong.user_id == user.id)
    ).all()

    favorites = db.scalars(
        select(Artist)
        .join(FavoriteArtist, FavoriteArtist.artist_id == Artist.id)
        .where(FavoriteArtist.user_id == user.id)
        .order_by(Artist.name)
    ).all()

    playlists = db.scalars(
        select(Playlist)
        .where(Playlist.user_id == user.id)
        .order_by(Playlist.created_at)
    ).all()

    return LibraryOut(
        liked_song_ids=list(liked),
        favorite_artist_ids=[a.id for a in favorites],
        favorite_artists=[ArtistOut.model_validate(a) for a in favorites],
        playlists=[_playlist_out(p) for p in playlists],
    )


# --------------------------------------------------------------------------
# Liked songs
# --------------------------------------------------------------------------

@router.put("/likes/{song_id}", status_code=status.HTTP_204_NO_CONTENT)
def like_song(
    song_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if db.get(Song, song_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Song not found")

    if db.get(LikedSong, {"user_id": user.id, "song_id": song_id}) is None:
        db.add(LikedSong(user_id=user.id, song_id=song_id))
        db.commit()
    return _no_content()


@router.delete("/likes/{song_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlike_song(
    song_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db.execute(
        delete(LikedSong).where(
            LikedSong.user_id == user.id, LikedSong.song_id == song_id
        )
    )
    db.commit()
    return _no_content()


# --------------------------------------------------------------------------
# Favourite artists
# --------------------------------------------------------------------------

@router.put("/artists/{artist_id}", status_code=status.HTTP_204_NO_CONTENT)
def favorite_artist(
    artist_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if db.get(Artist, artist_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Artist not found")

    if db.get(FavoriteArtist, {"user_id": user.id, "artist_id": artist_id}) is None:
        db.add(FavoriteArtist(user_id=user.id, artist_id=artist_id))
        db.commit()
    return _no_content()


@router.delete("/artists/{artist_id}", status_code=status.HTTP_204_NO_CONTENT)
def unfavorite_artist(
    artist_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db.execute(
        delete(FavoriteArtist).where(
            FavoriteArtist.user_id == user.id,
            FavoriteArtist.artist_id == artist_id,
        )
    )
    db.commit()
    return _no_content()


# --------------------------------------------------------------------------
# Playlists
# --------------------------------------------------------------------------

@router.get("/playlists", response_model=list[PlaylistOut])
def list_playlists(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    playlists = db.scalars(
        select(Playlist).where(Playlist.user_id == user.id)
        .order_by(Playlist.created_at)
    ).all()
    return [_playlist_out(p) for p in playlists]


@router.post("/playlists", response_model=PlaylistOut, status_code=201)
def create_playlist(
    body: PlaylistCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    name = body.name.strip()
    clash = db.scalar(
        select(Playlist).where(
            Playlist.user_id == user.id,
            func.lower(Playlist.name) == name.lower(),
        )
    )
    if clash:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            "You already have a playlist with that name")

    playlist = Playlist(user_id=user.id, name=name)
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return _playlist_out(playlist)


@router.patch("/playlists/{playlist_id}", response_model=PlaylistOut)
def rename_playlist(
    playlist_id: uuid.UUID,
    body: PlaylistUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    playlist = _owned_playlist(playlist_id, user, db)
    name = body.name.strip()

    clash = db.scalar(
        select(Playlist).where(
            Playlist.user_id == user.id,
            func.lower(Playlist.name) == name.lower(),
            Playlist.id != playlist.id,
        )
    )
    if clash:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            "You already have a playlist with that name")

    playlist.name = name
    db.commit()
    db.refresh(playlist)
    return _playlist_out(playlist)


@router.delete("/playlists/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_playlist(
    playlist_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    playlist = _owned_playlist(playlist_id, user, db)
    db.delete(playlist)          # entries go with it via cascade
    db.commit()
    return _no_content()


@router.put("/playlists/{playlist_id}/songs/{song_id}",
            status_code=status.HTTP_204_NO_CONTENT)
def add_to_playlist(
    playlist_id: uuid.UUID,
    song_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    playlist = _owned_playlist(playlist_id, user, db)
    if db.get(Song, song_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Song not found")

    existing = db.get(PlaylistSong,
                      {"playlist_id": playlist.id, "song_id": song_id})
    if existing is None:
        next_position = db.scalar(
            select(func.coalesce(func.max(PlaylistSong.position), -1) + 1)
            .where(PlaylistSong.playlist_id == playlist.id)
        )
        db.add(PlaylistSong(playlist_id=playlist.id, song_id=song_id,
                            position=next_position))
        db.commit()
    return _no_content()


@router.delete("/playlists/{playlist_id}/songs/{song_id}",
               status_code=status.HTTP_204_NO_CONTENT)
def remove_from_playlist(
    playlist_id: uuid.UUID,
    song_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    playlist = _owned_playlist(playlist_id, user, db)
    db.execute(
        delete(PlaylistSong).where(
            PlaylistSong.playlist_id == playlist.id,
            PlaylistSong.song_id == song_id,
        )
    )
    db.commit()
    return _no_content()
