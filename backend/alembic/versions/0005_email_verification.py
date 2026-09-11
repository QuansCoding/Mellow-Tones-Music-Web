"""email verification

1. `users.email_verified_at` — null means unverified. Every account that
   already exists is backfilled as verified (with its created_at), so nobody
   who signed up before this change gets locked out.

2. `email_verifications` — the one outstanding 6-digit code per unverified
   user, stored as a keyed hash.

Revision ID: 0005_email_verification
Revises: 0004_song_genre
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0005_email_verification"
down_revision = "0004_song_genre"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE users SET email_verified_at = COALESCE(created_at, now())")

    op.create_table(
        "email_verifications",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("email_verifications")
    op.drop_column("users", "email_verified_at")
