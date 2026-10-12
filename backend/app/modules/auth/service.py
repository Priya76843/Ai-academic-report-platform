"""Session primitives used by the auth dependency (foundation) and by B-02's register/login/logout endpoints."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.core.security import hash_token, new_session_token
from app.modules.auth.models import Session
from app.modules.users.models import User


def create_session(db: DbSession, user: User) -> str:
    """Create a session row and return the raw token to set in the cookie."""
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
    for s in db.execute(select(Session).where(Session.user_id == user_id, Session.revoked_at.is_(None))).scalars():
        s.revoked_at = now
    db.commit()
