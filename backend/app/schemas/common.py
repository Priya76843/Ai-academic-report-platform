from typing import Any

from pydantic import BaseModel


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = {}


class ErrorEnvelope(BaseModel):
    error: ErrorBody
    request_id: str | None


class Page[T](BaseModel):
    items: list[T]
    page: int = 1
    page_size: int = 20
    total: int


class HealthOut(BaseModel):
    status: str = "ok"
    version: str
