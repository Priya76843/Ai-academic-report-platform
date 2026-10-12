import uuid

from fastapi import APIRouter

from app.core.exceptions import ConflictError


def test_health(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.headers["X-Request-ID"]


def test_request_id_is_echoed(client):
    r = client.get("/api/v1/health", headers={"X-Request-ID": "abc-123"})
    assert r.headers["X-Request-ID"] == "abc-123"


def test_not_found_uses_envelope(client):
    r = client.get("/api/v1/does-not-exist")
    assert r.status_code == 404
    body = r.json()
    assert body["error"]["code"] == "NOT_FOUND"
    assert "detail" not in body
    assert body["request_id"]


def test_validation_error_maps_fields(signed_in):
    r = signed_in.get(f"/api/v1/jobs/{'not-a-uuid'}")
    assert r.status_code == 422
    body = r.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "job_id" in body["error"]["details"]["fields"]


def test_app_error_envelope(app, client):
    router = APIRouter()

    @router.get("/boom")
    def boom():
        raise ConflictError("Already generating.", code="GENERATION_ACTIVE", details={"section_id": str(uuid.uuid4())})

    app.include_router(router, prefix="/api/v1/_test")
    r = client.get("/api/v1/_test/boom")
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "GENERATION_ACTIVE"
    assert "section_id" in r.json()["error"]["details"]
