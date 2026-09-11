'''Where uploaded audio is stored.

Locally: the backend/uploads folder.
In production: a Supabase Storage bucket, because the API host (Render's free
tier) wipes its disk on every deploy and restart.

Which one is in use depends on env. variables: set SUPABASE_URL and
SUPABASE_SERVICE_KEY to use the bucket.
'''

import os
import pathlib
import uuid

import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
BUCKET = os.getenv("SUPABASE_BUCKET", "audio")
USE_BUCKET = bool(SUPABASE_URL and SUPABASE_KEY)

UPLOAD_DIR = pathlib.Path("uploads")
if not USE_BUCKET:
    UPLOAD_DIR.mkdir(exist_ok=True)

CONTENT_TYPES = {".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav"}


def _headers() -> dict[str, str]:
    # The service key is a server-side secret: it bypasses the bucket's
    # access rules. It must never reach the browser.
    return {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY}


def save_audio(data: bytes, original_name: str) -> str:
    """Store the bytes under a generated key and return that key."""
    suffix = pathlib.Path(original_name).suffix.lower()
    key = f"{uuid.uuid4()}{suffix}"          # NEVER reuse the user's filename

    if USE_BUCKET:
        response = httpx.post(
            f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{key}",
            headers={**_headers(),
                     "Content-Type": CONTENT_TYPES.get(suffix, "application/octet-stream")},
            content=data,
            timeout=60,
        )
        response.raise_for_status()           # fail the upload loudly, not silently
    else:
        (UPLOAD_DIR / key).write_bytes(data)
    return key


def delete_audio(key: str) -> None:
    """Best effort: a missing file must not block deleting the song row."""
    if USE_BUCKET:
        try:
            httpx.delete(f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{key}",
                         headers=_headers(), timeout=30)
        except httpx.HTTPError:
            pass    # orphans file so that song can still be deleted
    
    else:
        (UPLOAD_DIR / key).unlink(missing_ok=True)


def public_url(key: str) -> str | None:
    """Direct URL to the file in a public bucket, or None when stored locally."""
    if not USE_BUCKET:
        return None
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{key}"