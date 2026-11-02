"""Application settings. Every value comes from the environment (see .env.example); nothing is hard-coded."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Project Documentation Platform"
    app_version: str = "0.1.0"
    app_env: str = "local"  # local | dev | staging | production
    log_level: str = "INFO"
    api_prefix: str = "/api/v1"
    secret_key: str = Field(default="dev-only-change-me", min_length=8)

    database_url: str = "postgresql+psycopg://acamedia:acamedia@localhost:5433/acamedia"
    test_database_url: str = "postgresql+psycopg://acamedia:acamedia@localhost:5433/acamedia_test"
    redis_url: str = "redis://localhost:6379/0"
    resource_lock_ttl_seconds: int = Field(default=900, gt=0)
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    s3_endpoint_url: str | None = "http://localhost:4566"
    s3_public_endpoint_url: str | None = None  # URL the browser uses, when it differs from the API's
    s3_region: str = "ap-south-1"
    s3_bucket: str = "acamedia-local"
    s3_access_key_id: str = "test"
    s3_secret_access_key: str = "test"
    presign_ttl_seconds: int = 900

    session_cookie_name: str = "session_id"
    session_ttl_seconds: int = 7 * 24 * 3600
    cookie_secure: bool = False

    llm_provider: str = "fake"  # fake | anthropic
    anthropic_api_key: str | None = None
    embedding_provider: str = "fake"
    embedding_dim: int = 1024
    usd_inr_rate: float = 84.0

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
