"""add organizations and membership ownership

Revision ID: f3c6a9329cb8
Revises: e3dc2e76cfc3
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "f3c6a9329cb8"
down_revision = "e3dc2e76cfc3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_organizations_kind",
        "organizations",
        ["kind"],
    )

    op.create_table(
        "organization_members",
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_organization_members_user_id",
        "organization_members",
        ["user_id"],
    )

    op.add_column(
        "projects",
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    # Preserve an exact user-to-organization mapping during backfill.
    op.execute(
        """
        CREATE TEMPORARY TABLE user_organization_backfill (
            user_id UUID PRIMARY KEY,
            organization_id UUID NOT NULL,
            organization_name VARCHAR(255) NOT NULL
        ) ON COMMIT DROP
        """
    )

    op.execute(
        """
        INSERT INTO user_organization_backfill (
            user_id,
            organization_id,
            organization_name
        )
        SELECT
            id,
            gen_random_uuid(),
            split_part(email, '@', 1)
        FROM users
        """
    )

    op.execute(
        """
        INSERT INTO organizations (id, name, kind)
        SELECT organization_id, organization_name, 'STUDENT'
        FROM user_organization_backfill
        """
    )

    op.execute(
        """
        INSERT INTO organization_members (organization_id, user_id, role)
        SELECT organization_id, user_id, 'OWNER'
        FROM user_organization_backfill
        """
    )

    op.execute(
        """
        UPDATE projects
        SET organization_id = user_organization_backfill.organization_id
        FROM user_organization_backfill
        WHERE projects.user_id = user_organization_backfill.user_id
        """
    )

    op.alter_column(
        "projects",
        "organization_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    op.create_foreign_key(
        "fk_projects_organization_id_organizations",
        "projects",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.create_index(
        "ix_projects_organization_id",
        "projects",
        ["organization_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_projects_organization_id", table_name="projects")
    op.drop_constraint(
        "fk_projects_organization_id_organizations",
        "projects",
        type_="foreignkey",
    )
    op.drop_column("projects", "organization_id")

    op.drop_index(
        "ix_organization_members_user_id",
        table_name="organization_members",
    )
    op.drop_table("organization_members")

    op.drop_index("ix_organizations_kind", table_name="organizations")
    op.drop_table("organizations")
