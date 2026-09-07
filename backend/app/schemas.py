import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field

"""Data schemas for API response and requests"""

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)   # plaintext, inbound only

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    # TODO 1: id, username, email, created_at — and NO password field
    id: uuid.UUID
    username: str
    email: EmailStr
    created_at: datetime


class SongOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    # TODO 2: id, title, artist, duration_sec, uploader_id, created_at
    #   Deliberately omit storage_key — internal detail, not the client's business

    id: uuid.UUID
    title: str
    artist: str
    duration_sec: int
    uploader_id: uuid.UUID
    created_at: datetime

class SongUpdate(BaseModel):
    # TODO 3: title and artist, both Optional[str] = None (PATCH = partial)
    title: str | None = None
    artist: str | None = None
    ...
