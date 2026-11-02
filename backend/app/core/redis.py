"""Shared Redis client factory."""

from redis import Redis

from app.core.config import get_settings


def get_redis() -> Redis:
    """Return a Redis client using application settings."""
    settings = get_settings()
    return Redis.from_url(
        settings.redis_url,
        decode_responses=True,
    )
