"""
Authentication Service.

Contains all business logic for the authentication lifecycle:
  - register_user       → Create a new account.
  - login_user          → Verify credentials, create tokens and a session.
  - refresh_tokens      → Validate refresh token, rotate tokens, update session.
  - logout_user         → Revoke the active session.
  - get_current_user    → FastAPI dependency that authenticates protected routes
                          by reading and validating the access token cookie.

Design principles:
  - Routes (HTTP layer) call these functions and handle cookie/response concerns.
  - Services contain zero HTTP logic — they accept/return plain Python objects.
  - All database writes are explicitly committed here so callers don't need to
    manage transaction lifecycle.
"""

from datetime import datetime, timedelta, timezone

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_refresh_token,
    verify_password,
    REFRESH_TOKEN_COOKIE_NAME,
    ACCESS_TOKEN_COOKIE_NAME,
)
from app.core.config import settings
from app.models.user import User
from app.models.user_session import UserSession, SessionStatus
from app.schemas.user import UserCreate
from app.schemas.auth import LoginRequest


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register_user(payload: UserCreate, db: Session) -> User:
    """
    Register a new user account.

    Steps:
      1. Check the email is not already taken.
      2. Hash the plaintext password.
      3. Persist the new User row and commit.

    Args:
        payload: Validated registration data (email + raw password).
        db:      Active SQLAlchemy session.

    Returns:
        The newly created User ORM instance.

    Raises:
        HTTPException 409: If the email is already registered.
    """
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    new_user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def login_user(payload: LoginRequest, db: Session) -> tuple[User, str, str]:
    """
    Authenticate a user and create a new session.

    Steps:
      1. Look up the user by email.
      2. Verify the password hash matches.
      3. Confirm the account is active.
      4. Generate a fresh access token and refresh token.
      5. Persist a new UserSession row with the refresh token hash.

    Args:
        payload: Validated login credentials (email + raw password).
        db:      Active SQLAlchemy session.

    Returns:
        A 3-tuple of (User, access_token, refresh_token).

    Raises:
        HTTPException 401: If credentials are wrong or account is inactive.
                           We deliberately use the same error message for both
                           cases to prevent user enumeration.
    """
    _INVALID_CREDENTIALS_ERROR = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
    )

    user = db.query(User).filter(User.email == payload.email).first()

    # Use the same error for "not found" and "wrong password" to prevent
    # user enumeration attacks (attacker cannot distinguish which failed).
    if not user or not verify_password(payload.password, user.password_hash):
        raise _INVALID_CREDENTIALS_ERROR

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))

    session_expiry = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    new_session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(refresh_token),
        status=SessionStatus.ACTIVE,
        expires_at=session_expiry,
    )
    db.add(new_session)
    db.commit()

    return user, access_token, refresh_token


# ---------------------------------------------------------------------------
# Token Refresh with Rotation
# ---------------------------------------------------------------------------

def refresh_tokens(raw_refresh_token: str, db: Session) -> tuple[str, str]:
    """
    Validate the incoming refresh token and issue a rotated pair.

    Refresh Token Rotation steps:
      1. Decode the JWT and verify it is a refresh token.
      2. Extract the user ID from `sub`.
      3. Hash the incoming token and find the matching ACTIVE session.
      4. Verify the session has not expired.
      5. Generate a brand-new access token and refresh token.
      6. Update the session's `refresh_token_hash` and `last_used_at`.
         (The old hash is overwritten — the old token is now dead.)

    Args:
        raw_refresh_token: The raw JWT string read from the cookie.
        db:                Active SQLAlchemy session.

    Returns:
        A 2-tuple of (new_access_token, new_refresh_token).

    Raises:
        HTTPException 401: For any invalid, expired, or revoked token/session.
    """
    _INVALID_TOKEN_ERROR = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token.",
    )

    payload = decode_token(raw_refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise _INVALID_TOKEN_ERROR

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise _INVALID_TOKEN_ERROR

    # Look up the session by matching the hash of the token we received.
    token_hash = hash_refresh_token(raw_refresh_token)
    session = (
        db.query(UserSession)
        .filter(
            UserSession.user_id == int(user_id_str),
            UserSession.refresh_token_hash == token_hash,
            UserSession.status == SessionStatus.ACTIVE,
        )
        .first()
    )

    if not session:
        raise _INVALID_TOKEN_ERROR

    # Guard against sessions whose DB expiry has passed (e.g., if a stale
    # session was not cleaned up, or if the JWT `exp` was manually extended).
    now = datetime.now(timezone.utc)
    if session.expires_at.replace(tzinfo=timezone.utc) < now:
        session.status = SessionStatus.REVOKED
        db.commit()
        raise _INVALID_TOKEN_ERROR

    # Issue brand-new tokens.
    new_access_token = create_access_token(subject=user_id_str)
    new_refresh_token = create_refresh_token(subject=user_id_str)

    # Rotate: overwrite the stored hash with the new token's hash.
    # The previous raw token is now permanently invalid.
    session.refresh_token_hash = hash_refresh_token(new_refresh_token)
    session.last_used_at = now
    db.commit()

    return new_access_token, new_refresh_token


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

def logout_user(raw_refresh_token: str, db: Session) -> None:
    """
    Revoke the session associated with the provided refresh token.

    We identify the session by the token hash rather than by user ID alone,
    so that logging out on one device does not affect other active sessions.

    Args:
        raw_refresh_token: The raw JWT string read from the cookie.
        db:                Active SQLAlchemy session.

    Raises:
        HTTPException 401: If the token is invalid or no matching active session
                           is found. We still clear cookies in the route handler
                           regardless, so the client is always logged out locally.
    """
    payload = decode_token(raw_refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing refresh token.",
        )

    user_id_str = payload.get("sub")
    token_hash = hash_refresh_token(raw_refresh_token)

    session = (
        db.query(UserSession)
        .filter(
            UserSession.user_id == int(user_id_str),
            UserSession.refresh_token_hash == token_hash,
            UserSession.status == SessionStatus.ACTIVE,
        )
        .first()
    )

    if session:
        session.status = SessionStatus.REVOKED
        db.commit()


# ---------------------------------------------------------------------------
# Current User Dependency (protects routes)
# ---------------------------------------------------------------------------

def get_current_user(
    access_token: str | None = Cookie(default=None, alias=ACCESS_TOKEN_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that validates the access token cookie and returns
    the authenticated User.

    This dependency is designed to be injected into any route that requires
    authentication via `Depends(get_current_user)`.

    Validation steps:
      1. Confirm the cookie is present.
      2. Decode and verify the JWT signature and expiry.
      3. Confirm the token type is "access" (not a refresh token).
      4. Load the User from the database by ID.
      5. Confirm the user account is active.

    Note: No database session lookup is required to validate the access token
    itself — JWT verification is stateless. The DB hit here is only to
    confirm the user record still exists and is active.

    Args:
        access_token: Injected automatically from the HTTP-only cookie.
        db:           Database session dependency.

    Returns:
        The authenticated User ORM instance.

    Raises:
        HTTPException 401: For any invalid, missing, or expired access token,
                           or if the user no longer exists/is inactive.
    """
    _CREDENTIALS_EXCEPTION = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not access_token:
        raise _CREDENTIALS_EXCEPTION

    payload = decode_token(access_token)
    if not payload or payload.get("type") != "access":
        raise _CREDENTIALS_EXCEPTION

    user_id_str: str | None = payload.get("sub")
    if not user_id_str:
        raise _CREDENTIALS_EXCEPTION

    user = db.query(User).filter(User.id == int(user_id_str)).first()
    if not user or not user.is_active:
        raise _CREDENTIALS_EXCEPTION

    return user
