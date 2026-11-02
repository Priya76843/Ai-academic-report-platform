from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from redis.exceptions import RedisError

from app.core.exceptions import ConflictError
from app.core.resource_lock import with_resource_lock


@patch("app.core.resource_lock.get_redis")
def test_resource_lock_acquires_and_releases(mock_get_redis):
    redis = MagicMock()
    lock = MagicMock()
    lock.acquire.return_value = True
    redis.lock.return_value = lock
    mock_get_redis.return_value = redis

    resource_id = uuid4()

    with with_resource_lock("project", resource_id):
        lock.acquire.assert_called_once()

    lock.release.assert_called_once()
    redis.close.assert_called_once()


@patch("app.core.resource_lock.get_redis")
def test_resource_lock_conflict_raises_409(mock_get_redis):
    redis = MagicMock()
    lock = MagicMock()
    lock.acquire.return_value = False
    redis.lock.return_value = lock
    mock_get_redis.return_value = redis

    with pytest.raises(ConflictError) as exc_info, with_resource_lock("project", uuid4()):
        pytest.fail("Lock should not be acquired")

    assert exc_info.value.status_code == 409
    assert exc_info.value.code == "GENERATION_ACTIVE"
    lock.release.assert_not_called()
    redis.close.assert_called_once()


@patch("app.core.resource_lock.get_redis")
def test_resource_lock_redis_error_is_propagated(mock_get_redis):
    redis = MagicMock()
    lock = MagicMock()
    lock.acquire.side_effect = RedisError("Redis unavailable")
    redis.lock.return_value = lock
    mock_get_redis.return_value = redis

    with (
        pytest.raises(RuntimeError, match="Unable to acquire resource lock"),
        with_resource_lock("project", uuid4()),
    ):
        pass

    redis.close.assert_called_once()


@patch("app.core.resource_lock.get_redis")
def test_resource_lock_releases_even_when_operation_fails(mock_get_redis):
    redis = MagicMock()
    lock = MagicMock()
    lock.acquire.return_value = True
    redis.lock.return_value = lock
    mock_get_redis.return_value = redis

    with (
        pytest.raises(ValueError, match="operation failed"),
        with_resource_lock("project", uuid4()),
    ):
        raise ValueError("operation failed")

    lock.release.assert_called_once()
    redis.close.assert_called_once()


@patch("app.core.resource_lock.get_redis")
def test_resource_lock_release_failure_does_not_hide_operation_error(
    mock_get_redis,
):
    redis = MagicMock()
    lock = MagicMock()
    lock.acquire.return_value = True
    lock.release.side_effect = RedisError("Redis release failed")
    redis.lock.return_value = lock
    mock_get_redis.return_value = redis

    with (
        pytest.raises(ValueError, match="operation failed"),
        with_resource_lock("project", uuid4()),
    ):
        raise ValueError("operation failed")

    redis.close.assert_called_once()


@patch("app.core.resource_lock.get_redis")
def test_resource_lock_supports_custom_conflict_code(mock_get_redis):
    redis = MagicMock()
    lock = MagicMock()
    lock.acquire.return_value = False
    redis.lock.return_value = lock
    mock_get_redis.return_value = redis

    with (
        pytest.raises(ConflictError) as exc_info,
        with_resource_lock(
            "section",
            uuid4(),
            conflict_code="SECTION_GENERATION_ACTIVE",
        ),
    ):
        pytest.fail("Lock should not be acquired")

    assert exc_info.value.code == "SECTION_GENERATION_ACTIVE"
    redis.close.assert_called_once()
