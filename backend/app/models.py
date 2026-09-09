import re
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Integer, DateTime, ForeignKey, UniqueConstraint, Index, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

"""Models for the database"""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_artist(name: str) -> str:
    """Dedupe key for artist names.

    Lowercased, trimmed, inner whitespace collapsed — so "French Fuse",
    "french fuse" and "French  Fuse " are one artist. The display casing is
    kept separately in Artist.name.
    """
    return re.sub(r"\s+", " ", (name or "").strip()).lower()


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(60), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now)

    songs: Mapped[list["Song"]] = relationship(back_populates="uploader")

    # A user's library. Deleting the user takes their library with it.
    liked_songs: Mapped[list["LikedSong"]] = relationship(
        back_populates="user", cascade="all, delete-orphan")
    favorite_artists: Mapped[list["FavoriteArtist"]] = relationship(
        back_populates="user", cascade="all, delete-orphan")
    playlists: Mapped[list["Playlist"]] = relationship(
        back_populates="user", cascade="all, delete-orphan",
        order_by="Playlist.created_at")


class Artist(Base):
    """Artists are rows, not strings repeated on every song.

    `normalized_name` is the unique dedupe key; `name` is what gets shown.
    """
    __tablename__ = "artists"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    normalized_name: Mapped[str] = mapped_column(
        String(200), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now)

    songs: Mapped[list["Song"]] = relationship(back_populates="artist")


class Song(Base):
    """NOT Song(User). A song HAS an uploader; it is not one."""
    __tablename__ = "songs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), index=True)

    artist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("artists.id", ondelete="RESTRICT"), index=True)
    artist: Mapped["Artist"] = relationship(back_populates="songs", lazy="joined")

    duration_sec: Mapped[int] = mapped_column(Integer)
    storage_key: Mapped[str] = mapped_column(String(500))
    size_bytes: Mapped[int] = mapped_column(Integer)

    uploader_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), index=True)
    uploader: Mapped["User"] = relationship(back_populates="songs")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now)

    @property
    def artist_name(self) -> str:
        """Keeps the API contract stable now that artist is a relationship."""
        return self.artist.name if self.artist else ""


class LikedSong(Base):
    """Composite PK: liking twice is impossible in the database, not just in
    application code, so concurrent double-clicks cannot create duplicates."""
    __tablename__ = "liked_songs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    song_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("songs.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="liked_songs")
    song: Mapped["Song"] = relationship(lazy="joined")


class FavoriteArtist(Base):
    __tablename__ = "favorite_artists"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    artist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("artists.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="favorite_artists")
    artist: Mapped["Artist"] = relationship(lazy="joined")


class Playlist(Base):
    __tablename__ = "playlists"
    # Two playlists of the same name under one owner is almost always a
    # mistake; across owners it is fine.
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_playlist_owner_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship(back_populates="playlists")
    entries: Mapped[list["PlaylistSong"]] = relationship(
        back_populates="playlist", cascade="all, delete-orphan",
        order_by="PlaylistSong.position")


class PlaylistSong(Base):
    """`position` exists before any reorder UI does — adding a column to a
    populated table later is the expensive kind of change."""
    __tablename__ = "playlist_songs"

    playlist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True)
    song_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("songs.id", ondelete="CASCADE"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now)

    playlist: Mapped["Playlist"] = relationship(back_populates="entries")
    song: Mapped["Song"] = relationship(lazy="joined")


Index("ix_playlist_songs_playlist_position",
      PlaylistSong.playlist_id, PlaylistSong.position)
