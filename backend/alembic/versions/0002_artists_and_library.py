"""normalise artists into a table; add per-user library tables

Two things happen here:

1. `songs.artist` (free text, repeated on every row) becomes a real `artists`
   table with `songs.artist_id` pointing at it. Existing rows are backfilled
   and deduped case-insensitively, then the old column is dropped.

2. liked_songs / favorite_artists / playlists / playlist_songs are added, each
   keyed by user_id, so a library belongs to an account instead of a browser.

The normalisation helper is deliberately duplicated here rather than imported
from app.models: a migration must keep working even after the application code
it was written against has moved on.

Revision ID: 0002_artists_and_library
Revises: 0001_baseline
"""
import re
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_artists_and_library"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def _normalize(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip()).lower()


def upgrade() -> None:
    conn = op.get_bind()

    # --- 1. artists table -------------------------------------------------
    op.create_table(
        "artists",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("normalized_name", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_artists_normalized_name", "artists",
                    ["normalized_name"], unique=True)

    # --- 2. backfill from the existing free-text column --------------------
    existing = conn.execute(sa.text("SELECT DISTINCT artist FROM songs")).fetchall()

    by_norm: dict[str, tuple[uuid.UUID, str]] = {}
    for (raw,) in existing:
        norm = _normalize(raw)
        if not norm:
            continue
        # First spelling encountered wins as the display name.
        by_norm.setdefault(norm, (uuid.uuid4(), (raw or "").strip()))

    for norm, (artist_id, display) in by_norm.items():
        conn.execute(
            sa.text(
                "INSERT INTO artists (id, name, normalized_name, created_at) "
                "VALUES (:id, :name, :norm, now())"
            ),
            {"id": str(artist_id), "name": display, "norm": norm},
        )

    # --- 3. point songs at artists ----------------------------------------
    op.add_column("songs",
                  sa.Column("artist_id", postgresql.UUID(as_uuid=True),
                            nullable=True))

    # Match on the same normalisation used above, in SQL.
    for norm, (artist_id, _display) in by_norm.items():
        conn.execute(
            sa.text(
                r"UPDATE songs SET artist_id = :id "
                r"WHERE lower(btrim(regexp_replace(artist, '\s+', ' ', 'g'))) = :norm"
            ),
            {"id": str(artist_id), "norm": norm},
        )

    orphans = conn.execute(
        sa.text("SELECT count(*) FROM songs WHERE artist_id IS NULL")
    ).scalar()
    if orphans:
        # Refuse to continue rather than silently invent data.
        raise RuntimeError(
            f"{orphans} song(s) could not be matched to an artist — aborting "
            "so no rows are lost."
        )

    op.alter_column("songs", "artist_id", nullable=False)
    op.create_foreign_key("fk_songs_artist_id", "songs", "artists",
                          ["artist_id"], ["id"], ondelete="RESTRICT")
    op.create_index("ix_songs_artist_id", "songs", ["artist_id"])
    op.drop_column("songs", "artist")

    # --- 4. per-user library ----------------------------------------------
    op.create_table(
        "liked_songs",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("song_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], ondelete="CASCADE"),
        # Composite PK: a duplicate like is impossible in the database itself.
        sa.PrimaryKeyConstraint("user_id", "song_id"),
    )

    op.create_table(
        "favorite_artists",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["artist_id"], ["artists.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "artist_id"),
    )

    op.create_table(
        "playlists",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_playlist_owner_name"),
    )
    op.create_index("ix_playlists_user_id", "playlists", ["user_id"])

    op.create_table(
        "playlist_songs",
        sa.Column("playlist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("song_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["playlist_id"], ["playlists.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("playlist_id", "song_id"),
    )
    op.create_index("ix_playlist_songs_playlist_position", "playlist_songs",
                    ["playlist_id", "position"])


def downgrade() -> None:
    conn = op.get_bind()

    op.drop_table("playlist_songs")
    op.drop_table("playlists")
    op.drop_table("favorite_artists")
    op.drop_table("liked_songs")

    # Rebuild the free-text column from the relationship before losing it.
    op.add_column("songs",
                  sa.Column("artist", sa.String(length=200), nullable=True))
    conn.execute(sa.text(
        "UPDATE songs SET artist = artists.name "
        "FROM artists WHERE songs.artist_id = artists.id"
    ))
    op.alter_column("songs", "artist", nullable=False)

    op.drop_index("ix_songs_artist_id", table_name="songs")
    op.drop_constraint("fk_songs_artist_id", "songs", type_="foreignkey")
    op.drop_column("songs", "artist_id")

    op.drop_index("ix_artists_normalized_name", table_name="artists")
    op.drop_table("artists")
