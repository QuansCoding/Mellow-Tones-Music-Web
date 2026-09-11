import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, ConfigDict, Field

"""Data schemas for API response and requests"""


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    # bcrypt silently truncates past 72 bytes; reject rather than mislead.
    password: str = Field(min_length=8, max_length=72)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: EmailStr
    created_at: datetime


class ArtistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class SongOut(BaseModel):
    """Reads Song.artist_name but serialises as "artist": the API contract the
    frontend depends on does not change just because the storage did."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    title: str
    artist: str = Field(validation_alias="artist_name")
    artist_id: uuid.UUID
    duration_sec: int
    uploader_id: uuid.UUID
    created_at: datetime
    # Filled only where it was actually computed (catalogue, home, artist
    # page). None means "not counted in this response", which the client
    # shows as a dash rather than a misleading 0.
    play_count: int | None = None
    # Plays inside the ranking window (the last 24h, or all time when the
    # home page fell back). Only set on ranked lists.
    window_plays: int | None = None


class SongUpdate(BaseModel):
    title: str | None = None
    artist: str | None = None


# --------------------------------------------------------------------------
# Library
# --------------------------------------------------------------------------

class PlaylistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class PlaylistUpdate(BaseModel):
    """Partial: send only what changes, so a rename leaves visibility alone
    and a visibility toggle leaves the name alone."""
    name: str | None = Field(None, min_length=1, max_length=100)
    is_public: bool | None = None


class PlaylistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    created_at: datetime
    song_ids: list[uuid.UUID]
    is_public: bool = False


class LibraryOut(BaseModel):
    """One aggregate read so the client hydrates in a single round trip
    instead of three."""
    liked_song_ids: list[uuid.UUID]
    favorite_artist_ids: list[uuid.UUID]
    favorite_artists: list[ArtistOut]
    playlists: list[PlaylistOut]


# --------------------------------------------------------------------------
# Plays + discovery
# --------------------------------------------------------------------------

# Which ranking a home section ended up using: the last 24 hours, all time
# (today was too quiet to fill it), or newest-first (nothing played yet).
Window = Literal["day", "all", "new"]


class PlayCreate(BaseModel):
    song_id: uuid.UUID
    # Set when the song was played as part of a playlist; that is what ranks
    # playlists. Dropped server-side unless it is visible and holds the song.
    playlist_id: uuid.UUID | None = None
    # Signed-out listeners send a random id their browser keeps, so the
    # replay cooldown applies to them too. Ignored when signed in.
    listener_id: uuid.UUID | None = None


class PlayResult(BaseModel):
    counted: bool


class ArtistStatOut(ArtistOut):
    song_count: int
    play_count: int
    window_plays: int | None = None


class ArtistDetailOut(ArtistStatOut):
    songs: list[SongOut]


class PublicPlaylistOut(BaseModel):
    """A playlist as anyone may see it: owner by username only, never email."""
    id: uuid.UUID
    name: str
    owner: str
    is_public: bool
    song_ids: list[uuid.UUID]
    play_count: int
    window_plays: int | None = None


class HomeOut(BaseModel):
    """The whole front page in one round trip."""
    trending: list[SongOut]
    trending_window: Window
    artists: list[ArtistStatOut]
    artists_window: Window
    playlists: list[PublicPlaylistOut]
    playlists_window: Window


class SearchOut(BaseModel):
    """Mixed results. `playlists` is empty for anonymous callers rather than
    withheld — there is nothing private to hide, they simply have none."""
    songs: list[SongOut]
    artists: list[ArtistOut]
    playlists: list[PlaylistOut]
