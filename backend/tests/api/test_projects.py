import pytest

from app.core.config import get_settings
from app.modules.auth.service import create_session
from app.modules.organizations.models import OrganizationMember


def _organization_id(db, user):
    membership = db.query(OrganizationMember).filter_by(user_id=user.id, role="OWNER").one()
    return membership.organization_id


def test_create_project_requires_authentication(client):
    response = client.post(
        "/api/v1/projects",
        headers={"Idempotency-Key": "test-create-unauthenticated"},
        json={
            "report_type": "PROJECT_REPORT",
            "title": "My Project Report",
            "topic": "Testing project creation",
        },
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_create_project_rejects_missing_idempotency_key(signed_in):
    response = signed_in.post(
        "/api/v1/projects",
        json={
            "report_type": "PROJECT_REPORT",
            "title": "My Project Report",
            "topic": "Testing project creation",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_project_returns_created_response(signed_in, user):
    response = signed_in.post(
        "/api/v1/projects",
        headers={"Idempotency-Key": "test-create-project-success"},
        json={
            "report_type": "PROJECT_REPORT",
            "title": "My Project Report",
            "topic": "Testing project creation",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "My Project Report"
    assert body["topic"] == "Testing project creation"
    assert body["report_type"] == "PROJECT_REPORT"
    assert body["status"] == "DRAFT"
    assert isinstance(body["source_counts"], dict)
    assert body["source_counts"]["total"] == 0
    assert "template_name" in body
    assert "sections_approved" in body
    assert "sections_total" in body
    assert "details" in body
    assert "created_at" in body
    assert "updated_at" in body


def test_create_project_same_idempotency_key_returns_same_project(signed_in, db):
    headers = {"Idempotency-Key": "test-idempotency-same-request"}
    payload = {
        "report_type": "PROJECT_REPORT",
        "title": "My Project Report",
        "topic": "Testing idempotency",
    }

    first = signed_in.post("/api/v1/projects", headers=headers, json=payload)
    second = signed_in.post("/api/v1/projects", headers=headers, json=payload)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


def test_create_project_same_key_different_payload_returns_conflict(signed_in):
    headers = {"Idempotency-Key": "test-idempotency-different-payload"}

    first = signed_in.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "report_type": "PROJECT_REPORT",
            "title": "My Project Report",
            "topic": "Original topic",
        },
    )
    second = signed_in.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "report_type": "PROJECT_REPORT",
            "title": "My Project Report",
            "topic": "Different topic",
        },
    )

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_create_project_belongs_to_signed_in_user(signed_in, db, user):
    response = signed_in.post(
        "/api/v1/projects",
        headers={"Idempotency-Key": "test-project-owner"},
        json={
            "report_type": "PROJECT_REPORT",
            "title": "Ownership Test Project",
            "topic": "Testing project ownership",
        },
    )

    assert response.status_code == 201

    from app.modules.projects.models import Project

    project = db.get(Project, response.json()["id"])
    assert project is not None
    assert project.user_id == user.id


def test_list_projects_returns_paginated_response(signed_in):
    response = signed_in.get("/api/v1/projects")

    assert response.status_code == 200

    body = response.json()
    assert body["page"] == 1
    assert body["page_size"] == 20
    assert body["total"] == 0
    assert body["items"] == []


def test_list_projects_only_returns_signed_in_users_projects(signed_in, db, user, other_user):
    from app.modules.projects.models import Project

    own_project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="My Project Report",
        topic="My topic",
        status="DRAFT",
        details={},
    )
    other_project = Project(
        user_id=other_user.id,
        organization_id=_organization_id(db, other_user),
        report_type="PROJECT_REPORT",
        title="Other Project Report",
        topic="Other topic",
        status="DRAFT",
        details={},
    )

    db.add_all([own_project, other_project])
    db.flush()

    response = signed_in.get("/api/v1/projects")

    assert response.status_code == 200
    body = response.json()
    returned_ids = {item["id"] for item in body["items"]}

    assert str(own_project.id) in returned_ids
    assert str(other_project.id) not in returned_ids
    assert body["total"] == 1


def test_list_projects_excludes_soft_deleted_projects(signed_in, db, user):
    from datetime import UTC, datetime

    from app.modules.projects.models import Project

    active_project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Active Project",
        topic="Active topic",
        status="DRAFT",
        details={},
    )
    deleted_project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Deleted Project",
        topic="Deleted topic",
        status="DRAFT",
        details={},
        deleted_at=datetime.now(UTC),
    )

    db.add_all([active_project, deleted_project])
    db.flush()

    response = signed_in.get("/api/v1/projects")

    assert response.status_code == 200
    body = response.json()
    returned_titles = {item["title"] for item in body["items"]}

    assert "Active Project" in returned_titles
    assert "Deleted Project" not in returned_titles
    assert body["total"] == 1


def test_list_projects_supports_pagination(signed_in, db, user):
    from app.modules.projects.models import Project

    projects = [
        Project(
            user_id=user.id,
            organization_id=_organization_id(db, user),
            report_type="PROJECT_REPORT",
            title=f"Project Report {number}",
            topic=f"Topic {number}",
            status="DRAFT",
            details={},
        )
        for number in range(1, 4)
    ]

    db.add_all(projects)
    db.flush()

    first_page = signed_in.get("/api/v1/projects?page=1&page_size=2")
    second_page = signed_in.get("/api/v1/projects?page=2&page_size=2")

    assert first_page.status_code == 200
    assert second_page.status_code == 200

    first_body = first_page.json()
    second_body = second_page.json()

    assert first_body["page"] == 1
    assert first_body["page_size"] == 2
    assert first_body["total"] == 3
    assert len(first_body["items"]) == 2

    assert second_body["page"] == 2
    assert second_body["page_size"] == 2
    assert second_body["total"] == 3
    assert len(second_body["items"]) == 1

    first_ids = {item["id"] for item in first_body["items"]}
    second_ids = {item["id"] for item in second_body["items"]}
    assert first_ids.isdisjoint(second_ids)


@pytest.mark.parametrize(
    "query",
    [
        "page=0",
        "page=-1",
        "page_size=0",
        "page_size=101",
    ],
)
def test_list_projects_rejects_invalid_pagination(signed_in, query):
    response = signed_in.get(f"/api/v1/projects?{query}")

    assert response.status_code == 422


def test_get_project_returns_project_details(signed_in, db, user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="My Project Report",
        topic="Testing project retrieval",
        status="DRAFT",
        details={},
    )

    db.add(project)
    db.flush()

    response = signed_in.get(f"/api/v1/projects/{project.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(project.id)
    assert body["title"] == "My Project Report"
    assert body["topic"] == "Testing project retrieval"


def test_get_project_returns_404_for_another_user(signed_in, db, other_user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=other_user.id,
        organization_id=_organization_id(db, other_user),
        report_type="PROJECT_REPORT",
        title="Other User's Project",
        topic="Testing access control",
        status="DRAFT",
        details={},
    )

    db.add(project)
    db.flush()

    response = signed_in.get(f"/api/v1/projects/{project.id}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_patch_project_updates_fields(signed_in, db, user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Original Title",
        topic="Original Topic",
        status="DRAFT",
        details={},
    )

    db.add(project)
    db.flush()

    response = signed_in.patch(
        f"/api/v1/projects/{project.id}",
        json={
            "title": "Updated Project",
            "topic": "Updated Topic",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Updated Project"
    assert body["topic"] == "Updated Topic"


def test_patch_project_returns_404_for_another_user(signed_in, db, other_user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=other_user.id,
        organization_id=_organization_id(db, other_user),
        report_type="PROJECT_REPORT",
        title="Other User's Project",
        topic="Testing access control",
        status="DRAFT",
        details={},
    )

    db.add(project)
    db.flush()

    response = signed_in.patch(
        f"/api/v1/projects/{project.id}",
        json={
            "title": "Updated Title",
            "topic": "Updated Topic",
        },
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_patch_project_replaces_details(signed_in, db, user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Project with Details",
        topic="Testing details replacement",
        status="DRAFT",
        details={
            "students": [{"name": "Old Student", "usn": "OLD001"}],
            "instructions": "Old instructions",
        },
    )

    db.add(project)
    db.flush()

    response = signed_in.patch(
        f"/api/v1/projects/{project.id}",
        json={
            "details": {
                "students": [
                    {"name": "New Student", "usn": "NEW001"},
                ],
                "instructions": "New instructions",
            }
        },
    )

    assert response.status_code == 200

    details = response.json()["details"]
    assert details["students"] == [{"name": "New Student", "usn": "NEW001"}]
    assert details["instructions"] == "New instructions"
    assert all(student["name"] != "Old Student" for student in details["students"])


def test_delete_project_soft_deletes_project(signed_in, db, user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Project to Delete",
        topic="Testing soft deletion",
        status="DRAFT",
        details={},
    )

    db.add(project)
    db.flush()

    response = signed_in.delete(f"/api/v1/projects/{project.id}")

    assert response.status_code == 204
    assert response.content == b""

    db.refresh(project)
    assert project.deleted_at is not None


def test_delete_project_returns_404_for_another_user(signed_in, db, other_user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=other_user.id,
        organization_id=_organization_id(db, other_user),
        report_type="PROJECT_REPORT",
        title="Other User's Project",
        topic="Testing access control",
        status="DRAFT",
        details={},
    )

    db.add(project)
    db.flush()

    response = signed_in.delete(f"/api/v1/projects/{project.id}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
    db.refresh(project)
    assert project.deleted_at is None


def test_deleted_project_is_not_in_project_list(signed_in, db, user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Deleted Project",
        topic="Testing project list",
        status="DRAFT",
        details={},
    )

    db.add(project)
    db.flush()

    delete_response = signed_in.delete(f"/api/v1/projects/{project.id}")
    assert delete_response.status_code == 204

    list_response = signed_in.get("/api/v1/projects")

    assert list_response.status_code == 200
    assert all(item["id"] != str(project.id) for item in list_response.json()["items"])


def test_patch_project_keeps_omitted_fields_unchanged(signed_in, db, user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Original Project",
        topic="Original Topic",
        description="Keep this description",
        target_pages=25,
        status="DRAFT",
        details={},
    )
    db.add(project)
    db.flush()

    response = signed_in.patch(
        f"/api/v1/projects/{project.id}",
        json={"title": "Updated Project"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Updated Project"
    assert body["topic"] == "Original Topic"
    assert body["description"] == "Keep this description"
    assert body["target_pages"] == 25


def test_patch_project_rejects_invalid_target_pages(signed_in, db, user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Validation Test Project",
        topic="Testing target page validation",
        target_pages=25,
        status="DRAFT",
        details={},
    )
    db.add(project)
    db.flush()

    for invalid_pages in (9, 301):
        response = signed_in.patch(
            f"/api/v1/projects/{project.id}",
            json={"target_pages": invalid_pages},
        )
        assert response.status_code == 422

    db.refresh(project)
    assert project.target_pages == 25


def test_patch_project_rejects_invalid_string_lengths(signed_in, db, user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Valid Project Title",
        topic="Valid topic",
        description="Original description",
        status="DRAFT",
        details={},
    )
    db.add(project)
    db.flush()

    invalid_payloads = [
        {"title": "Bad"},
        {"title": "T" * 256},
        {"description": "D" * 5001},
        {"topic": "T" * 501},
    ]

    for payload in invalid_payloads:
        response = signed_in.patch(
            f"/api/v1/projects/{project.id}",
            json=payload,
        )
        assert response.status_code == 422, payload

    db.refresh(project)
    assert project.title == "Valid Project Title"
    assert project.topic == "Valid topic"
    assert project.description == "Original description"


def test_create_project_expired_idempotency_key_can_be_reused(signed_in, db, user):
    from datetime import UTC, datetime, timedelta

    from app.modules.projects.idempotency_models import ProjectIdempotencyKey

    key = "test-idempotency-expired-key"
    header = {"Idempotency-Key": key}

    first_response = signed_in.post(
        "/api/v1/projects",
        headers=header,
        json={
            "report_type": "PROJECT_REPORT",
            "title": "Original Project Title",
            "topic": "Original topic",
        },
    )

    assert first_response.status_code == 201

    key_record = db.query(ProjectIdempotencyKey).filter_by(user_id=user.id, key=key).one()

    key_record.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()

    second_response = signed_in.post(
        "/api/v1/projects",
        headers=header,
        json={
            "report_type": "PROJECT_REPORT",
            "title": "Replacement Project Title",
            "topic": "Replacement topic",
        },
    )

    assert second_response.status_code == 201
    assert second_response.json()["id"] != first_response.json()["id"]
    assert second_response.json()["title"] == "Replacement Project Title"


def test_patch_project_rejects_null_details(signed_in, db, user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Details Validation Project",
        topic="Testing null details",
        status="DRAFT",
        details={"instructions": "Keep these details"},
    )
    db.add(project)
    db.flush()

    response = signed_in.patch(
        f"/api/v1/projects/{project.id}",
        json={"details": None},
    )

    assert response.status_code == 422

    db.refresh(project)
    assert project.details["instructions"] == "Keep these details"


def test_patch_project_round_trips_numeric_semester(signed_in, db, user):
    from app.modules.projects.models import Project

    project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Semester Test Project",
        topic="Testing numeric semester",
        status="DRAFT",
        details={},
    )
    db.add(project)
    db.flush()

    response = signed_in.patch(
        f"/api/v1/projects/{project.id}",
        json={
            "details": {
                "institution": {
                    "college": "ABC College",
                    "semester": 8,
                }
            }
        },
    )

    assert response.status_code == 200
    assert response.json()["details"]["institution"]["semester"] == 8
    assert isinstance(response.json()["details"]["institution"]["semester"], int)

    get_response = signed_in.get(f"/api/v1/projects/{project.id}")

    assert get_response.status_code == 200

    semester = get_response.json()["details"]["institution"]["semester"]
    assert semester == 8
    assert isinstance(semester, int)


def test_staff_member_can_access_organization_projects(client, db, user, other_user):
    from app.modules.organizations.models import OrganizationMember
    from app.modules.projects.models import Project

    project = Project(
        user_id=user.id,
        organization_id=_organization_id(db, user),
        report_type="PROJECT_REPORT",
        title="Staff access test",
        topic="Membership-based access",
    )
    db.add(project)
    db.flush()

    db.add(
        OrganizationMember(
            organization_id=project.organization_id,
            user_id=other_user.id,
            role="STAFF",
        )
    )
    db.commit()

    token = create_session(db, other_user)
    client.cookies.set(get_settings().session_cookie_name, token)

    # STAFF can see the organisation's project in the project list.
    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    assert any(item["id"] == str(project.id) for item in response.json()["items"])

    # STAFF can read the project.
    response = client.get(f"/api/v1/projects/{project.id}")
    assert response.status_code == 200

    # STAFF can update the project.
    response = client.patch(
        f"/api/v1/projects/{project.id}",
        json={"title": "Updated by staff"},
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Updated by staff"

    # STAFF can delete the project.
    response = client.delete(f"/api/v1/projects/{project.id}")
    assert response.status_code == 204


def test_project_status_recompute_sets_draft():
    from app.modules.projects.enums import ProjectStatus
    from app.modules.projects.models import Project
    from app.modules.projects.status_service import ProjectStatusService

    project = Project(
        report_type="PROJECT_REPORT",
        title="Test Project",
        topic="Testing project status",
        status="COMPLETED",
        details={},
    )

    result = ProjectStatusService.recompute(project)

    assert result == ProjectStatus.DRAFT
    assert project.status == "DRAFT"
