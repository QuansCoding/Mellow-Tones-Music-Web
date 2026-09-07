import uuid, pathlib

UPLOAD_DIR = pathlib.Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

def save_audio(data: bytes, original_name: str) -> str:
    """Write bytes to disk under a generated key. Returns the storage_key."""
    # TODO 1: take the suffix from original_name (pathlib.Path(...).suffix)
    # TODO 2: key = f"{uuid.uuid4()}{suffix}"  — NEVER reuse the user's filename
    # TODO 3: write bytes to UPLOAD_DIR / key, return key
    
    suffix = pathlib.Path(original_name).suffix.lower()
    key = f"{uuid.uuid4()}{suffix}"
    (UPLOAD_DIR / key).write_bytes(data)
    return key
