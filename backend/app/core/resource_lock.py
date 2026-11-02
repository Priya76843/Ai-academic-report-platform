"""Redis-backed resource locking for asynchronous operations."""

from contextlib import contextmanager, suppress
from uuid import UUID

from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.exceptions import ConflictError
from app.core.redis import get_redis


@contextmanager
def with_resource_lock(
    resource_type: str,
    resource_id: UUID,
    *,
    conflict_code: str = "GENERATION_ACTIVE",
):
    settings = get_settings()
    key = f"resource-lock:{resource_type}:{resource_id}"
    redis = get_redis()

    try:
        lock = redis.lock(
            key,
            timeout=settings.resource_lock_ttl_seconds,
            blocking=False,
        )

        try:
            acquired = lock.acquire()
        except RedisError as exc:
            raise RuntimeError("Unable to acquire resource lock.") from exc

        if not acquired:
            raise ConflictError(
                f"{resource_type} is already being processed.",
                code=conflict_code,
            )

        try:
            yield
        finally:
            with suppress(RedisError):
                # Do not mask an exception raised by the protected operation.
                # The lock may already have expired or Redis may be unavailable.
                lock.release()
    finally:
        redis.close()
