"""Test harness. API/DB tests need the compose Postgres (make up); pure unit tests do not.

Each test runs inside a transaction that is rolled back, so tests never see each other's rows."""

import os
import uuid
from collections.abc import Generator
from urllib.parse import urlparse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("LLM_PROVIDER", "fake")
os.environ.setdefault("EMBEDDING_PROVIDER", "fake")

from app.core.config import get_settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db import models  # noqa: E402, F401
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.modules.auth.service import create_session  # noqa: E402
from app.modules.organizations.enums import OrganizationKind, OrganizationRole
from app.modules.organizations.models import Organization, OrganizationMember
from app.modules.users.models import User  # noqa: E402

TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", get_settings().test_database_url)
_TEST_DATABASE_NAME = urlparse(TEST_DB_URL).path.lstrip("/")
if not _TEST_DATABASE_NAME.endswith("_test"):
    raise RuntimeError("Refusing destructive test setup: TEST_DATABASE_URL must target a database ending in '_test'.")


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DB_URL, pool_pre_ping=True)
    try:
        with eng.connect() as c:
            c.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            c.commit()
    except Exception as exc:  # pragma: no cover
        pytest.skip(f"database not available at {TEST_DB_URL}: {exc}")

    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine) -> Generator[Session, None, None]:
    connection = engine.connect()
    trans = connection.begin()
    session = sessionmaker(bind=connection, join_transaction_mode="create_savepoint")()
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture
def app(db):
    application = create_app()
    application.dependency_overrides[get_db] = lambda: db
    return application


@pytest.fixture
def client(app) -> TestClient:
    return TestClient(app)


@pytest.fixture
def user(db) -> User:
    u = User(
        email=f"{uuid.uuid4().hex[:8]}@example.com",
        password_hash=hash_password("correct horse battery"),
    )
    db.add(u)
    db.flush()

    organization = Organization(
        name=u.email.split("@", 1)[0],
        kind=OrganizationKind.STUDENT.value,
    )
    db.add(organization)
    db.flush()

    db.add(
        OrganizationMember(
            organization_id=organization.id,
            user_id=u.id,
            role=OrganizationRole.OWNER.value,
        )
    )
    db.commit()
    return u


@pytest.fixture
def other_user(db) -> User:
    u = User(
        email=f"{uuid.uuid4().hex[:8]}@example.com",
        password_hash=hash_password("another password"),
    )
    db.add(u)
    db.flush()

    organization = Organization(
        name=u.email.split("@", 1)[0],
        kind=OrganizationKind.STUDENT.value,
    )
    db.add(organization)
    db.flush()

    db.add(
        OrganizationMember(
            organization_id=organization.id,
            user_id=u.id,
            role=OrganizationRole.OWNER.value,
        )
    )
    db.commit()
    return u


@pytest.fixture
def signed_in(client: TestClient, db: Session, user: User) -> TestClient:
    token = create_session(db, user)
    client.cookies.set(get_settings().session_cookie_name, token)
    return client
