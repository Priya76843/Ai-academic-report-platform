"""Foundation exposes only /auth/me. Register, login, logout and rate limiting are ticket B-02."""

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.modules.users.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
