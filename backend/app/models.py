import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

"""Models for the database"""
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)

    # TODO 1: password_hash — String(60), not nullable. NEVER "password".
    password_hash: Mapped[str] = mapped_column(String(60), nullable=False)

    # TODO 2: created_at — DateTime(timezone=True), default=now in UTC
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # TODO 3: songs relationship back to Song, back_populates="uploader"
    songs: Mapped[list["Song"]] = relationship(back_populates="uploader")

class Song(Base):
    """NOT Song(User). A song HAS an uploader; it is not one."""
    __tablename__ = "songs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), index=True)

    # TODO 4: artist — String(200). MVP tradeoff: one string, not a table.
    artist: Mapped[str] = mapped_column(String(200))

    # TODO 5: duration_sec — Integer
    duration_sec: Mapped[int] = mapped_column(Integer)

    # TODO 6: storage_key — String(500). The address of the bytes, not the bytes.
    storage_key: Mapped[str] = mapped_column(String(500))

    # TODO 7: size_bytes — Integer
    size_bytes: Mapped[int] = mapped_column(Integer)
    
    # TODO 8: uploader_id — ForeignKey("users.id"), indexed. The has-a link.
    uploader_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)

    # TODO 9: uploader relationship back to User, back_populates="songs"
    uploader: Mapped["User"] = relationship(back_populates="songs")

    # TODO 10: created_at — DateTime(timezone=True), default=now in UTC
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
