"""The fixed list of genres a song can be tagged with.

A fixed list rather than free text: free text splits one genre into
"Hip-Hop", "hip hop" and "HipHop", and a filter over that is useless. Keys
are stored on the song; labels are only for display, so a label can be
reworded later without touching any rows.
"""
from fastapi import HTTPException, status

GENRES: dict[str, str] = {
    "pop": "Pop",
    "hip-hop": "Hip-Hop",
    "rnb": "R&B",
    "rock": "Rock",
    "indie": "Indie",
    "electronic": "Electronic",
    "lo-fi": "Lo-fi",
    "jazz": "Jazz",
    "classical": "Classical",
    "ambient": "Ambient",
    "acoustic": "Acoustic",
    "soundtrack": "Soundtrack",
    "holiday": "Holiday",
    "other": "Other",
}


def clean_genre(value: str | None) -> str | None:
    """Blank means "not tagged"; anything else must be a known key."""
    if value is None or not value.strip():
        return None
    key = value.strip().lower()
    if key not in GENRES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown genre")
    return key
