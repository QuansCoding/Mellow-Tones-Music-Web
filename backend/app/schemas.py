import uuid
from datetime import datetime
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


class SongUpdate(BaseModel):
    title: str | None = None
    artist: str | None = None


# --------------------------------------------------------------------------
# Library
# --------------------------------------------------------------------------

class PlaylistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class PlaylistUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class PlaylistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    created_at: datetime
    song_ids: list[uuid.UUID]


class LibraryOut(BaseModel):
    """One aggregate read so the client hydrates in a single round trip
    instead of three."""
    liked_song_ids: list[uuid.UUID]
    favorite_artist_ids: list[uuid.UUID]
    favorite_artists: list[ArtistOut]
    playlists: list[PlaylistOut]


class SearchOut(BaseModel):
    """Mixed results. `playlists` is empty for anonymous callers rather than
    withheld — there is nothing private to hide, they simply have none."""
    songs: list[SongOut]
    artists: list[ArtistOut]
    playlists: list[PlaylistOut]
