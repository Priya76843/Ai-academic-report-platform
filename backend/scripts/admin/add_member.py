"""One-off admin commands for organisation onboarding.

Run from the backend directory:
    uv run python -m scripts.admin.add_member create-centre --name "ABC College"
    uv run python -m scripts.admin.add_member add-member --organization-id <UUID> --email user@example.com --role STAFF
"""

import argparse
import sys
import uuid

from sqlalchemy import select

from app.db.session import SessionLocal
from app.modules.organizations.enums import OrganizationKind, OrganizationRole
from app.modules.organizations.models import Organization, OrganizationMember
from app.modules.users.models import User


def create_centre(name: str) -> None:
    """Create a CENTRE organisation."""
    with SessionLocal() as db:
        try:
            organization = Organization(
                name=name.strip(),
                kind=OrganizationKind.CENTRE.value,
            )
            db.add(organization)
            db.commit()
            db.refresh(organization)

            print("Centre organisation created successfully.")
            print(f"Organization ID: {organization.id}")
            print(f"Name: {organization.name}")
        except Exception:
            db.rollback()
            raise


def add_member(organization_id: uuid.UUID, email: str, role: str) -> None:
    """Add an existing user to an organisation."""
    normalized_email = email.strip().lower()

    with SessionLocal() as db:
        try:
            organization = db.get(Organization, organization_id)
            if organization is None:
                raise ValueError(f"Organisation not found: {organization_id}")

            user = db.execute(select(User).where(User.email == normalized_email)).scalar_one_or_none()

            if user is None:
                raise ValueError(f"User not found: {normalized_email}")

            existing_membership = db.get(
                OrganizationMember,
                (organization_id, user.id),
            )

            if existing_membership is not None:
                raise ValueError(
                    f"User is already a member of this organisation. Existing role: {existing_membership.role}"
                )

            membership = OrganizationMember(
                organization_id=organization_id,
                user_id=user.id,
                role=role,
            )
            db.add(membership)
            db.commit()

            print("Organisation membership created successfully.")
            print(f"Organisation: {organization.name}")
            print(f"User: {user.email}")
            print(f"Role: {role}")
        except Exception:
            db.rollback()
            raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Admin utilities for organisation onboarding.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    centre_parser = subparsers.add_parser(
        "create-centre",
        help="Create a CENTRE organisation.",
    )
    centre_parser.add_argument("--name", required=True)

    member_parser = subparsers.add_parser(
        "add-member",
        help="Add an existing user to an organisation.",
    )
    member_parser.add_argument("--organization-id", type=uuid.UUID, required=True)
    member_parser.add_argument("--email", required=True)
    member_parser.add_argument(
        "--role",
        choices=[
            OrganizationRole.OWNER.value,
            OrganizationRole.STAFF.value,
        ],
        default=OrganizationRole.STAFF.value,
    )

    args = parser.parse_args()

    try:
        if args.command == "create-centre":
            if not args.name.strip():
                parser.error("--name cannot be empty")
            create_centre(args.name)

        elif args.command == "add-member":
            add_member(args.organization_id, args.email, args.role)

    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
