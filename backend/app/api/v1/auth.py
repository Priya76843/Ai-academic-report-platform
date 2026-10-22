from fastapi import APIRouter, Request, Response, status

from app.api.deps import CurrentUser, DbDep
from app.core.config import get_settings
from app.modules.auth.rate_limit import check_login_rate_limit
from app.modules.auth.schemas import LoginRequest, RegisterRequest
from app.modules.auth.service import (
    authenticate_user,
    create_session,
    register_user_with_session,
    revoke_session,
)
from app.modules.users.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbDep, response: Response) -> UserOut:
    user, token = register_user_with_session(
        db,
        str(payload.email),
        payload.password,
    )
    _set_session_cookie(response, token)
    return UserOut.model_validate(user)


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, request: Request, db: DbDep, response: Response) -> UserOut:
    client_ip = request.client.host if request.client is not None else "unknown"
    check_login_rate_limit(str(payload.email), client_ip)

    user = authenticate_user(db, str(payload.email), payload.password)
    token = create_session(db, user)
    _set_session_cookie(response, token)
    return UserOut.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, db: DbDep, response: Response) -> Response:
    settings = get_settings()
    token = request.cookies.get(settings.session_cookie_name)

    if token is not None:
        revoke_session(db, token)

    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
