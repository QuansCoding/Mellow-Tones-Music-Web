"""record plays; let owners make a playlist public

1. `play_events` — one row per counted listen. Totals, "today" rankings for
   songs and artists, and playlist rankings are all derived from it.

2. `playlists.is_public` — defaults to false, so every playlist that already
   exists stays private until its owner opts in.

Revision ID: 0003_plays_and_public_playlists
Revises: 0002_artists_and_library
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003_plays_and_public_playlists"
down_revision = "0002_artists_and_library"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "playlists",
        sa.Column("is_public", sa.Boolean(), nullable=False,
                  server_default=sa.false()),
    )

    op.create_table(
        "play_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("song_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("playlist_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("listener_key", sa.String(length=64), nullable=False),
        sa.Column("played_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["playlist_id"], ["playlists.id"],
                                ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    # Every ranking filters on played_at; per-song and per-playlist totals
    # and the replay cooldown each get an index shaped for their lookup.
    op.create_index("ix_play_events_played_at", "play_events", ["played_at"])
    op.create_index("ix_play_events_song_played", "play_events",
                    ["song_id", "played_at"])
    op.create_index("ix_play_events_playlist_played", "play_events",
                    ["playlist_id", "played_at"])
    op.create_index("ix_play_events_listener_song_played", "play_events",
                    ["listener_key", "song_id", "played_at"])


def downgrade() -> None:
    op.drop_table("play_events")          # its indexes go with it
    op.drop_column("playlists", "is_public")
