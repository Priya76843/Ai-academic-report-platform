import uuid
from datetime import UTC, datetime, timedelta

from argon2.exceptions import InvalidHashError, VerificationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.core.exceptions import ConflictError, UnauthenticatedError
from app.core.security import hash_password, hash_token, new_session_token, verify_password
from app.modules.auth.models import Session
from app.modules.users.models import User


def get_user_by_email(db: DbSession, email: str) -> User | None:
    normalized_email = email.strip().lower()
    return db.execute(select(User).where(User.email == normalized_email)).scalar_one_or_none()


def authenticate_user(db: DbSession, email: str, password: str) -> User:
    user = get_user_by_email(db, email)

    if user is None:
        verify_password(password, _DUMMY_PASSWORD_HASH)
        raise UnauthenticatedError(
            "Invalid email or password.",
            code="INVALID_CREDENTIALS",
        )

    try:
        password_valid = verify_password(password, user.password_hash)
    except (InvalidHashError, VerificationError):
        password_valid = False

    if not password_valid or not user.is_active:
        raise UnauthenticatedError(
            "Invalid email or password.",
            code="INVALID_CREDENTIALS",
        )

    return user


_DUMMY_PASSWORD_HASH = hash_password("dummy-password-used-for-timing")


def register_user_with_session(db: DbSession, email: str, password: str) -> tuple[User, str]:
    normalized_email = email.strip().lower()

    if get_user_by_email(db, normalized_email) is not None:
        raise ConflictError(
            "An account with this email already exists.",
            code="EMAIL_TAKEN",
        )

    user = User(
        email=normalized_email,
        password_hash=hash_password(password),
    )
    token = new_session_token()

    try:
        db.add(user)
        db.flush()
        db.add(
            Session(
                user_id=user.id,
                token_hash=hash_token(token),
                expires_at=datetime.now(UTC) + timedelta(seconds=get_settings().session_ttl_seconds),
            )
        )
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        if get_user_by_email(db, normalized_email) is not None:
            raise ConflictError(
                "An account with this email already exists.",
                code="EMAIL_TAKEN",
            ) from exc
        raise

    return user, token


def create_session(db: DbSession, user: User) -> str:
    token = new_session_token()
    db.add(
        Session(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(UTC) + timedelta(seconds=get_settings().session_ttl_seconds),
        )
    )
    db.commit()
    return token


def get_user_for_token(db: DbSession, token: str) -> User | None:
    row = db.execute(
        select(Session, User).join(User, User.id == Session.user_id).where(Session.token_hash == hash_token(token))
    ).first()
    if row is None:
        return None
    session, user = row
    now = datetime.now(UTC)
    if session.revoked_at is not None or session.expires_at <= now or not user.is_active:
        return None
    return user


def revoke_session(db: DbSession, token: str) -> None:
    session = db.execute(select(Session).where(Session.token_hash == hash_token(token))).scalar_one_or_none()

    if session and session.revoked_at is None:
        session.revoked_at = datetime.now(UTC)
        db.commit()


def revoke_all_for_user(db: DbSession, user_id: uuid.UUID) -> None:
    now = datetime.now(UTC)
    for session in db.execute(
        select(Session).where(Session.user_id == user_id, Session.revoked_at.is_(None))
    ).scalars():
        session.revoked_at = now
    db.commit()
