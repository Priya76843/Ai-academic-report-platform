import uuid

from app.api.deps import get_owned_project
from app.core.exceptions import NotFoundError
from app.modules.auth.service import create_session, revoke_session
from app.modules.jobs.enums import JobType
from app.modules.jobs.service import create_job
from app.modules.organizations.enums import OrganizationRole
from app.modules.organizations.models import OrganizationMember
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
    membership = db.query(OrganizationMember).filter_by(user_id=owner.id, role="OWNER").one()

    p = Project(
        user_id=owner.id,
        organization_id=membership.organization_id,
        report_type="PROJECT_REPORT",
        title="T",
        topic="t",
    )
    db.add(p)
    db.commit()
    return p


def test_owned_project_dependency_hides_other_users_projects(db, user, other_user):
    mine = _project(db, user)
    theirs = _project(db, other_user)

    # Add other_user as a STAFF member of user's organization.
    db.add(
        OrganizationMember(
            organization_id=mine.organization_id,
            user_id=other_user.id,
            role=OrganizationRole.STAFF.value,
        )
    )
    db.commit()

    # The owner can access their project.
    assert get_owned_project(mine.id, db, user).id == mine.id

    # A STAFF member can access the same organization project.
    assert get_owned_project(mine.id, db, other_user).id == mine.id

    # A non-member cannot access another organization's project.
    try:
        get_owned_project(theirs.id, db, user)
    except NotFoundError as e:
        assert e.status_code == 404
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

    body = signed_in.get(f"/api/v1/jobs/{my_job.id}").json()

    assert body["id"] == str(my_job.id)
    assert body["project_id"] == str(mine.id)
    assert body["job_type"] == "ingest_pdf"
    assert body["status"] == "QUEUED"
    assert isinstance(body["progress"], dict)
    assert body["attempt"] == 1
    assert body["error"] is None
    assert "created_at" in body
    assert "started_at" in body
    assert "completed_at" in body


def test_project_jobs_active_filter(signed_in, db, user):
    project = _project(db, user)

    queued = create_job(db, job_type=JobType.INGEST_PDF, project_id=project.id)
    running = create_job(db, job_type=JobType.GENERATE_SECTION, project_id=project.id)
    retrying = create_job(db, job_type=JobType.EXPORT_DOCX, project_id=project.id)
    succeeded = create_job(db, job_type=JobType.INGEST_PDF, project_id=project.id)
    failed = create_job(db, job_type=JobType.INGEST_PDF, project_id=project.id)

    running.status = "RUNNING"
    retrying.status = "RETRYING"
    succeeded.status = "SUCCEEDED"
    failed.status = "FAILED"
    db.commit()

    response = signed_in.get(
        f"/api/v1/projects/{project.id}/jobs",
        params={"active": "true"},
    )

    assert response.status_code == 200
    returned_ids = {item["id"] for item in response.json()}

    assert returned_ids == {
        str(queued.id),
        str(running.id),
        str(retrying.id),
    }


def test_project_jobs_without_active_filter_returns_all(signed_in, db, user):
    project = _project(db, user)

    queued = create_job(db, job_type=JobType.INGEST_PDF, project_id=project.id)
    succeeded = create_job(db, job_type=JobType.INGEST_PDF, project_id=project.id)
    succeeded.status = "SUCCEEDED"
    db.commit()

    response = signed_in.get(f"/api/v1/projects/{project.id}/jobs")

    assert response.status_code == 200
    returned_ids = {item["id"] for item in response.json()}
    assert returned_ids == {str(queued.id), str(succeeded.id)}


def test_project_jobs_rejects_other_users_project(signed_in, db, other_user):
    project = _project(db, other_user)

    response = signed_in.get(f"/api/v1/projects/{project.id}/jobs")

    assert response.status_code == 404


def test_project_jobs_returns_empty_list(signed_in, db, user):
    project = _project(db, user)

    response = signed_in.get(
        f"/api/v1/projects/{project.id}/jobs",
        params={"active": "true"},
    )

    assert response.status_code == 200
    assert response.json() == []


def test_staff_member_can_access_organization_jobs(signed_in, db, user, other_user):
    project = _project(db, user)

    # Add other_user as a STAFF member of the project's organization.
    db.add(
        OrganizationMember(
            organization_id=project.organization_id,
            user_id=other_user.id,
            role=OrganizationRole.STAFF.value,
        )
    )
    db.commit()

    job = create_job(
        db,
        job_type=JobType.INGEST_PDF,
        project_id=project.id,
    )

    # Authenticate as the STAFF member.
    token = create_session(db, other_user)
    signed_in.cookies.set("session_id", token)

    # STAFF can read the job directly.
    job_response = signed_in.get(f"/api/v1/jobs/{job.id}")
    assert job_response.status_code == 200
    assert job_response.json()["id"] == str(job.id)

    # STAFF can list jobs belonging to the organization project.
    project_jobs_response = signed_in.get(f"/api/v1/projects/{project.id}/jobs")
    assert project_jobs_response.status_code == 200
    assert str(job.id) in {item["id"] for item in project_jobs_response.json()}
