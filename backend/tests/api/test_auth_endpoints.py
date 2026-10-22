from app.core.security import verify_password
from app.modules.users.models import User


def test_register_creates_user_and_session(client, db):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "new-user@example.com", "password": "correct horse battery"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new-user@example.com"
    assert "password" not in str(body).lower()
    assert "password_hash" not in str(body).lower()

    user = db.query(User).filter_by(email="new-user@example.com").one()
    assert verify_password("correct horse battery", user.password_hash)
    assert client.cookies.get("session_id")


def test_register_rejects_duplicate_email(client, user):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": user.email, "password": "correct horse battery"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_TAKEN"


def test_login_accepts_valid_credentials(client, user):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "correct horse battery"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == user.email
    assert "password" not in str(response.json()).lower()
    assert "password_hash" not in str(response.json()).lower()
    assert client.cookies.get("session_id")


def test_login_uses_same_error_for_unknown_email_and_wrong_password(client, user):
    unknown_email = client.post(
        "/api/v1/auth/login",
        json={"email": "unknown-user@example.com", "password": "correct horse battery"},
    )
    wrong_password = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "incorrect password"},
    )
    assert unknown_email.status_code == wrong_password.status_code == 401
    assert unknown_email.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert wrong_password.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert unknown_email.json()["error"]["message"] == wrong_password.json()["error"]["message"]


def test_logout_revokes_session_and_clears_cookie(signed_in):
    response = signed_in.post("/api/v1/auth/logout")
    assert response.status_code == 204
    assert signed_in.get("/api/v1/auth/me").status_code == 401


def test_login_rate_limit_returns_429(client, user):
    from redis import Redis

    from app.core.config import get_settings

    redis = Redis.from_url(get_settings().redis_url, decode_responses=True)
    client_ip = "test-login-rate-limit-ip"
    user_email = user.email.strip().lower()
    other_email = "another-user@example.com"
    user_key = f"auth:login:{user_email}:{client_ip}"
    other_key = f"auth:login:{other_email}:{client_ip}"

    try:
        redis.delete(user_key, other_key)

        for _ in range(10):
            client.post(
                "/api/v1/auth/login",
                json={"email": user.email, "password": "wrong-password"},
            )

        blocked = client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "wrong-password"},
        )

        assert blocked.status_code == 429

        other = client.post(
            "/api/v1/auth/login",
            json={"email": other_email, "password": "wrong-password"},
        )

        assert other.status_code == 401
    finally:
        redis.delete(user_key, other_key)
        redis.close()


def test_logout_without_sessions_cookie_returns_204(client):
    response = client.post("/api/v1/auth/logout")

    assert response.status_code == 204
    assert response.content == b""
    assert "session_id" in response.headers.get("set-cookie", "")


def test_logout_with_invalid_session_token_returns_204(client):
    client.cookies.set("session_id", "invalid-session-token")
    response = client.post("/api/v1/auth/logout")

    assert response.status_code == 204
    assert response.content == b""
    assert "session_id" in response.headers.get("set-cookie", "")


def test_register_rejects_password_shorter_than_10_characters(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "short-password@example.com", "password": "short123"},
    )

    assert response.status_code == 422


def test_login_allows_short_password_to_reach_authentication(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "unknown-user@example.com", "password": "short"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_fails_open_when_redis_is_unavailable(client, user, monkeypatch):
    from redis.exceptions import RedisError

    from app.modules.auth import rate_limit

    class UnavailableRedis:
        def incr(self, key):
            raise RedisError("Redis is unavailable")

        def close(self):
            pass

    monkeypatch.setattr(
        rate_limit.Redis,
        "from_url",
        lambda *args, **kwargs: UnavailableRedis(),
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "correct horse battery"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == user.email
