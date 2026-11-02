"""add operation receipts for idempotency

Revision ID: e3dc2e76cfc3
Revises: ced36758c0a8
Create Date: 2026-10-29 16:09:41.536300
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e3dc2e76cfc3"
down_revision = "ced36758c0a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "operation_receipts",
        sa.Column("job_id", sa.UUID(), nullable=False),
        sa.Column("operation_key", sa.String(length=200), nullable=False),
        sa.Column("input_hash", sa.String(length=64), nullable=False),
        sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("operation_key", name="uq_operation_receipts_operation_key"),
    )
    op.create_index(op.f("ix_operation_receipts_job_id"), "operation_receipts", ["job_id"], unique=False)


def downgrade() -> None:
    op.drop_index(
        op.f("ix_operation_receipts_job_id"),
        table_name="operation_receipts",
    )
    op.drop_table("operation_receipts")
