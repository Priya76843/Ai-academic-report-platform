import os
from uuid import uuid4

import pytest
from redis import Redis

from app.core.config import get_settings
from app.core.exceptions import ConflictError
from app.core.resource_lock import with_resource_lock


@pytest.mark.skipif(
    os.getenv("RUN_REDIS_INTEGRATION") != "1",
    reason="Set RUN_REDIS_INTEGRATION=1 to run against live Redis",
)
def test_resource_lock_conflict_against_live_redis():
    redis = Redis.from_url(
        get_settings().redis_url,
        decode_responses=True,
    )
    resource_id = uuid4()
    key = f"resource-lock:project:{resource_id}"
    lock = redis.lock(key, timeout=15, blocking=False)

    try:
        assert lock.acquire()

        with pytest.raises(ConflictError) as exc_info:
            with_resource_lock("project", resource_id).__enter__()

        assert exc_info.value.status_code == 409
        assert exc_info.value.code == "GENERATION_ACTIVE"
    finally:
        if lock.owned():
            lock.release()
        redis.close()
