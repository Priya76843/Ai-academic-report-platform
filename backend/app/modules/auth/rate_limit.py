import logging
from contextlib import suppress

from redis.client import Redis
from redis.exceptions import RedisError

from app.core.exceptions import RateLimitedError
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

LOGIN_ATTEMPT_LIMIT = 10
LOGIN_WINDOW_SECONDS = 60


def _increment(redis: Redis, key: str) -> int:
    result = redis.incr(key)
    if not isinstance(result, int):
        raise RuntimeError("Redis returned an unexpected counter value.")
    return result


def check_login_rate_limit(email: str, client_ip: str) -> None:
    normalized_email = email.strip().lower()
    key = f"auth:login:{normalized_email}:{client_ip}"
    redis = get_redis()

    try:
        attempts = _increment(redis, key)
        if attempts == 1:
            redis.expire(key, LOGIN_WINDOW_SECONDS)

        if attempts > LOGIN_ATTEMPT_LIMIT:
            raise RateLimitedError("Too many login attempts. Please try again later.")
    except RedisError:
        logger.warning(
            "Redis is unavailable; allowing login attempt for %s",
            client_ip,
        )
    finally:
        with suppress(RedisError):
            redis.close()
