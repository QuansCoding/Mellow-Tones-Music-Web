import re
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..genres import clean_genre
from ..models import Artist, Song, User, normalize_artist
from ..plays import song_play_counts, songs_out
from ..schemas import SongOut, SongUpdate
from ..security import get_current_user
from ..storage import UPLOAD_DIR, delete_audio, public_url, save_audio


router = APIRouter(prefix="/songs", tags=["songs"])

@router.get("", response_model=list[SongOut])
def list_songs(db: Session = Depends(get_db)):

    # TODO 1: return every song, newest first
    #   Hint: db.query(Song).order_by(Song.created_at.desc()).all()
    db_songs = db.query(Song).order_by(Song.created_at.desc()).all()
    # All-time plays ride along with the catalogue, so every surface that
    # shows a song can show its count without a second request.
    return songs_out(db_songs, song_play_counts(db))


@router.get("/mine", response_model=list[SongOut])
def list_my_songs(db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    """Only the songs the caller uploaded, newest first.

    This is what the Manage page reads. Managing songs is scoped to the ones
    you posted, so the list never offers you an edit or delete button that the
    server would then refuse. Declared before "/{song_id}" so the literal
    path wins over the UUID parameter.
    """
    return (
        db.query(Song)
        .filter(Song.uploader_id == user.id)
        .order_by(Song.created_at.desc())
        .all()
    )


@router.get("/{song_id}", response_model=SongOut)
def get_song(song_id: uuid.UUID, db: Session = Depends(get_db)):

    # TODO 2: fetch by primary key; raise 404 if missing
    #   Hint: db.get(Song, song_id), then
    #   raise HTTPException(status_code=404, detail="Song not found")
    db_song = db.get(Song, song_id)
    if not db_song:
        raise HTTPException(status_code=404, detail="Song not found")
    return db_song



def get_or_create_artist(db: Session, name: str) -> Artist:
    """Resolve a submitted artist name to a row, creating it if new.

    Matching is on the normalised form, so "French Fuse", "french fuse" and
    "French  Fuse " all land on the same artist instead of three near-duplicates
    that a user would have to favourite separately.
    """
    normalized = normalize_artist(name)
    if not normalized:
        raise HTTPException(422, "Artist name cannot be blank")

    artist = db.query(Artist).filter(
        Artist.normalized_name == normalized).first()
    if artist is None:
        artist = Artist(name=name.strip(), normalized_name=normalized)
        db.add(artist)
        db.flush()          # assigns artist.id without ending the transaction
    return artist


MAX_BYTES = 15 * 1024 * 1024          # 15 MB
ALLOWED = {"audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"}

# Per-account limits over a rolling 24 hours, so one account (or a bot that
# got past sign-up) can't fill the storage bucket.
UPLOADS_PER_DAY = 10
BYTES_PER_DAY = 75 * 1024 * 1024      # 75 MB


def check_upload_quota(db: Session, user: User, incoming_bytes: int) -> None:
    since = datetime.now(timezone.utc) - timedelta(days=1)
    count, used = (
        db.query(func.count(Song.id), func.coalesce(func.sum(Song.size_bytes), 0))
        .filter(Song.uploader_id == user.id, Song.created_at >= since)
        .one()
    )
    if count >= UPLOADS_PER_DAY:
        raise HTTPException(
            429, f"You've reached the limit of {UPLOADS_PER_DAY} uploads in "
                 "24 hours. Please try again later.")
    if used + incoming_bytes > BYTES_PER_DAY:
        used_mb = used / (1024 * 1024)
        raise HTTPException(
            429, f"This upload would take you past 75 MB in 24 hours "
                 f"({used_mb:.1f} MB used so far). Please try again later.")

@router.post("", response_model=SongOut, status_code=201)
async def upload_song(
    title: str = Form(...),
    artist: str = Form(...),
    duration_sec: int = Form(...),
    file: UploadFile = File(...),
    genre: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # TODO 4: reject if file.content_type not in ALLOWED → 415
    # TODO 5: data = await file.read(); reject if len(data) > MAX_BYTES → 413
    # TODO 6: key = save_audio(data, file.filename)
    # TODO 7: build Song(..., storage_key=key, uploader_id=user.id)
    # TODO 8: db.add(song); db.commit(); db.refresh(song); return song
    if file.content_type not in ALLOWED:
        raise HTTPException(415, "Unsupported audio format")

    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File too large (max 15 MB)")
    check_upload_quota(db, user, len(data))

    # Validated before the file is written, so a bad genre cannot leave an
    # orphaned upload on disk.
    genre_key = clean_genre(genre)
    artist_row = get_or_create_artist(db, artist)

    key = save_audio(data, file.filename)
    try:
        song = Song(
            title=title, artist_id=artist_row.id, duration_sec=duration_sec,
            storage_key=key, size_bytes=len(data), uploader_id=user.id,
            genre=genre_key,
        )
        db.add(song)
        db.commit()
    except Exception:
        # The file is stored but the row isn't, so nothing would ever point
        # at it. Remove it before letting the error through.
        db.rollback()
        delete_audio(key)
        raise
    db.refresh(song)
    
    return song


"""Stream Song Method"""

@router.get("/{song_id}/stream")
def stream_song(song_id: uuid.UUID, request: Request,
                db: Session = Depends(get_db)):
    song = db.get(Song, song_id)
    if song is None:
        raise HTTPException(404, "Song not found")

    url = public_url(song.storage_key)
    if url is not None:
        # The bucket serves the file itself, including HTTP Range requests,
        # so seeking still works and the API never proxies audio bytes.
        return RedirectResponse(url, status_code=307)

    path = UPLOAD_DIR / song.storage_key

    file_size = path.stat().st_size
    range_header = request.headers.get("range")

    # TODO 1: no Range header? return the whole file with
    #   headers={"Accept-Ranges": "bytes"} and media_type="audio/mpeg"

    # TODO 2: parse "bytes=START-END" with re.match(r"bytes=(\d+)-(\d*)", ...)
    #   END may be empty → default to file_size - 1

    # TODO 3: read that slice: f.seek(start); f.read(end - start + 1)

    # TODO 4: return Response(..., status_code=206, headers={
    #     "Content-Range": f"bytes {start}-{end}/{file_size}",
    #     "Accept-Ranges": "bytes"})
    
    if range_header is None:
        return StreamingResponse(
            open(path, "rb"),
            media_type="audio/mpeg",
            headers={"Accept-Ranges": "bytes",
                     "Content-Length": str(file_size)},
        )

    match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    start = int(match.group(1))
    end = int(match.group(2)) if match.group(2) else file_size - 1
    end = min(end, file_size - 1)

    with open(path, "rb") as f:
        f.seek(start)
        data = f.read(end - start + 1)

    return Response(
        content=data,
        status_code=206,
        media_type="audio/mpeg",
        headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(len(data)),
        },
    )

"""Method to edit a song's metadata"""

@router.patch("/{song_id}", response_model=SongOut)
def update_song(song_id: uuid.UUID, changes: SongUpdate,
                db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    """Rename a song or re-attribute its artist.

    Same ownership rule as delete: 404 if it does not exist, 403 if it is
    someone else's. Only the fields sent are touched, so a title-only edit
    leaves the artist alone.
    """
    song = db.get(Song, song_id)
    if song is None:
        raise HTTPException(404, "Song not found")
    if song.uploader_id != user.id:
        raise HTTPException(403, "You can only edit your own songs")

    data = changes.model_dump(exclude_unset=True)
    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            raise HTTPException(422, "Title cannot be blank")
        song.title = title
    if "artist" in data:
        song.artist_id = get_or_create_artist(db, data["artist"] or "").id
    if "genre" in data:
        song.genre = clean_genre(data["genre"])

    db.commit()
    db.refresh(song)
    return song


"""Method to delete songs"""

@router.delete("/{song_id}", status_code=204)
def delete_song(song_id: uuid.UUID, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    # TODO 1: fetch the song; 404 if missing
    # TODO 2: if song.uploader_id != user.id → 403, NOT 404
    #   Logged in is not the same as allowed. This is the 401/403 split.
    # TODO 3: db.delete(song); db.commit(); then delete the file (row first)
    song = db.get(Song, song_id)
    if song is None:
        raise HTTPException(404, "Song not found")
    if song.uploader_id != user.id:
        raise HTTPException(403, "You can only delete your own songs")

    key = song.storage_key          # read now: the row is gone after commit
    db.delete(song)
    db.commit()
    # Row first, file second. If the commit fails, the song is untouched and
    # still plays; if removing the file fails, the worst case is an unused
    # file in storage — never a song whose audio is missing.
    delete_audio(key)
    