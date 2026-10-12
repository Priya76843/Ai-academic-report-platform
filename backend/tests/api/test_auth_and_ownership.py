import uuid

from app.api.deps import get_owned_project
from app.core.exceptions import NotFoundError
from app.modules.auth.service import create_session, revoke_session
from app.modules.jobs.enums import JobType
from app.modules.jobs.service import create_job
from app.modules.projects.models import Project


def test_me_requires_session(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"


def test_me_returns_user(signed_in, user):
    r = signed_in.get("/api/v1/auth/me")
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == user.email
    assert "password" not in str(body).lower()


def test_revoked_session_is_rejected(client, db, user):
    token = create_session(db, user)
    client.cookies.set("session_id", token)
    assert client.get("/api/v1/auth/me").status_code == 200
    revoke_session(db, token)
    assert client.get("/api/v1/auth/me").status_code == 401


def _project(db, owner):
    p = Project(user_id=owner.id, report_type="PROJECT_REPORT", title="T", topic="t")
    db.add(p)
    db.commit()
    return p


def test_owned_project_dependency_hides_other_users_projects(db, user, other_user):
    mine = _project(db, user)
    theirs = _project(db, other_user)
    assert get_owned_project(mine.id, db, user).id == mine.id
    try:
        get_owned_project(theirs.id, db, user)
    except NotFoundError as e:
        assert e.status_code == 404  # never 403
    else:
        raise AssertionError("expected NotFoundError")


def test_job_endpoint_is_owner_scoped(signed_in, db, user, other_user):
    mine = _project(db, user)
    theirs = _project(db, other_user)
    my_job = create_job(
        db, job_type=JobType.INGEST_PDF, project_id=mine.id, resource_type="source", resource_id=uuid.uuid4()
    )
    their_job = create_job(db, job_type=JobType.INGEST_PDF, project_id=theirs.id)
    assert signed_in.get(f"/api/v1/jobs/{my_job.id}").status_code == 200
    assert signed_in.get(f"/api/v1/jobs/{my_job.id}").json()["status"] == "QUEUED"
    assert signed_in.get(f"/api/v1/jobs/{their_job.id}").status_code == 404
