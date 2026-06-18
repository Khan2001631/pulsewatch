"""
Authentication Routes.

Thin HTTP layer that:
  1. Accepts and validates incoming requests using Pydantic schemas.
  2. Delegates all business logic to `auth_service`.
  3. Manages cookie setting/clearing on the Response object.
  4. Returns appropriate HTTP status codes and response bodies.

Routes intentionally contain no business logic — they are pure HTTP glue.
"""

from fastapi import APIRouter, Cookie, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.security import (
    REFRESH_TOKEN_COOKIE_NAME,
    clear_auth_cookies,
    set_auth_cookies,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, MessageResponse
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import (
    get_current_user,
    login_user,
    logout_user,
    refresh_tokens,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description=(
        "Create a new account with email and password. "
        "Returns the created user profile (no tokens — the user must log in separately)."
    ),
)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Register a new user.

    On success: returns the user profile with HTTP 201.
    On duplicate email: returns HTTP 409.
    On validation failure: returns HTTP 422 (handled automatically by FastAPI).
    """
    user = register_user(payload=payload, db=db)
    return UserResponse.model_validate(user)


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

@router.post(
    "/login",
    response_model=MessageResponse,
    summary="Log in and receive authentication cookies",
    description=(
        "Authenticate with email and password. On success, sets two HttpOnly cookies: "
        "`access_token` (15 min) and `refresh_token` (7 days). "
        "The browser will automatically attach these cookies to subsequent requests."
    ),
)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> MessageResponse:
    """
    Authenticate a user and set auth cookies.

    On success: sets cookies and returns a confirmation message.
    On bad credentials: returns HTTP 401.
    On inactive account: returns HTTP 403.
    """
    _user, access_token, refresh_token = login_user(payload=payload, db=db)
    set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token)
    return MessageResponse(message="Login successful.")


# ---------------------------------------------------------------------------
# POST /auth/refresh
# ---------------------------------------------------------------------------

@router.post(
    "/refresh",
    response_model=MessageResponse,
    summary="Refresh access token using the refresh token cookie",
    description=(
        "Reads the `refresh_token` HttpOnly cookie, validates it, rotates the token pair, "
        "and sets fresh cookies. The old refresh token is permanently invalidated. "
        "This endpoint is called automatically by the frontend RTK Query interceptor."
    ),
)
def refresh(
    response: Response,
    db: Session = Depends(get_db),
    raw_refresh_token: str | None = Cookie(
        default=None, alias=REFRESH_TOKEN_COOKIE_NAME
    ),
) -> MessageResponse:
    """
    Rotate the token pair.

    On success: sets new cookies (old tokens are now invalid).
    On invalid/expired/revoked token: returns HTTP 401.
    """
    if not raw_refresh_token:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cookie is missing.",
        )

    new_access_token, new_refresh_token = refresh_tokens(
        raw_refresh_token=raw_refresh_token, db=db
    )
    set_auth_cookies(response, access_token=new_access_token, refresh_token=new_refresh_token)
    return MessageResponse(message="Token refreshed successfully.")


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------

@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Log out and revoke the current session",
    description=(
        "Revokes the active session associated with the current `refresh_token` cookie "
        "and clears both auth cookies. The user must log in again after this."
    ),
)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    raw_refresh_token: str | None = Cookie(
        default=None, alias=REFRESH_TOKEN_COOKIE_NAME
    ),
) -> MessageResponse:
    """
    Revoke the session and clear cookies.

    We always clear cookies — even if the token is invalid — so the client
    is logged out locally regardless of server-side state.
    """
    if raw_refresh_token:
        # Best-effort: attempt to revoke the session. If the token is already
        # invalid, we suppress the error and still clear cookies below.
        try:
            logout_user(raw_refresh_token=raw_refresh_token, db=db)
        except Exception:
            pass

    clear_auth_cookies(response)
    return MessageResponse(message="Logged out successfully.")


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently authenticated user",
    description=(
        "Returns the profile of the user identified by the `access_token` cookie. "
        "Requires a valid, non-expired access token."
    ),
)
def me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Return the authenticated user's profile.

    Access control is handled entirely by the `get_current_user` dependency —
    this route handler only needs to serialise and return the result.

    On success: returns user profile.
    On missing/invalid access token: returns HTTP 401 (from dependency).
    """
    return UserResponse.model_validate(current_user)
