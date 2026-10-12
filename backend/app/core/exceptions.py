"""Application errors and the single error envelope (contract §1.1).

Raise AppError subclasses from services; handlers convert them. FastAPI's default {"detail": ...} body is never
returned. Every envelope carries the request_id so a user report can be matched to logs."""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger

log = get_logger(__name__)


class AppError(Exception):
    status_code = 500
    code = "INTERNAL_ERROR"

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message or self.__class__.__name__.replace("Error", "")
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class UnauthenticatedError(AppError):
    status_code = 401
    code = "UNAUTHENTICATED"


class ConflictError(AppError):
    """409: the resource is in a state that forbids the operation. Always pass a specific code."""

    status_code = 409
    code = "CONFLICT"


class ValidationFailedError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"


class RateLimitedError(AppError):
    status_code = 429
    code = "RATE_LIMITED"


class ProviderError(AppError):
    """Raised by AI providers; category tells the job framework whether to retry."""

    status_code = 502
    code = "PROVIDER_ERROR"

    def __init__(self, message: str, *, category: str = "internal", retryable: bool = False) -> None:
        super().__init__(message, details={"category": category, "retryable": retryable})
        self.category = category
        self.retryable = retryable


def _envelope(request: Request, status: int, code: str, message: str, details: dict[str, Any] | None = None):
    return JSONResponse(
        status_code=status,
        content={
            "error": {"code": code, "message": message, "details": details or {}},
            "request_id": getattr(request.state, "request_id", None),
        },
    )


_HTTP_CODES = {
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError):
        if exc.status_code >= 500:
            log.error("app_error", code=exc.code, message=exc.message)
        return _envelope(request, exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        fields: dict[str, str] = {}
        for err in exc.errors():
            loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
            fields[".".join(loc) or "_"] = err.get("msg", "Invalid value")
        return _envelope(request, 422, "VALIDATION_ERROR", "Please correct the highlighted fields.", {"fields": fields})

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        code = _HTTP_CODES.get(exc.status_code, "HTTP_ERROR")
        message = exc.detail if isinstance(exc.detail, str) else code.replace("_", " ").title()
        return _envelope(request, exc.status_code, code, message)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        log.exception("unhandled_exception")
        return _envelope(
            request,
            500,
            "INTERNAL_ERROR",
            "Something went wrong on our side. Retry, or contact support with the request id.",
        )
