"""add project idempotency keys

Revision ID: ced36758c0a8
Revises: 0001
Create Date: 2026-10-23 11:58:05.407580
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "ced36758c0a8"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_idempotency_keys",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("response", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "key", name="uq_project_idempotency_keys_user_key"),
    )
    op.create_index(op.f("ix_project_idempotency_keys_user_id"), "project_idempotency_keys", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_project_idempotency_keys_user_id"), table_name="project_idempotency_keys")
    op.drop_table("project_idempotency_keys")
    # ### end Alembic commands ###
