"""optional genre on songs

Nullable: every existing song starts untagged, and tagging stays optional on
upload. Indexed because the Discover filter will select on it.

Revision ID: 0004_song_genre
Revises: 0003_plays_and_public_playlists
"""
import sqlalchemy as sa
from alembic import op

revision = "0004_song_genre"
down_revision = "0003_plays_and_public_playlists"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("songs", sa.Column("genre", sa.String(length=40), nullable=True))
    op.create_index("ix_songs_genre", "songs", ["genre"])


def downgrade() -> None:
    op.drop_index("ix_songs_genre", table_name="songs")
    op.drop_column("songs", "genre")
