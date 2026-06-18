"""
Core Security Module.

Centralises all cryptographic and token utilities for the authentication system:
  - Password hashing and verification using bcrypt (via passlib).
  - JWT Access Token and Refresh Token generation.
  - JWT decoding and claim extraction.
  - Refresh Token hashing (sha256) — we store only the hash in the DB, never
    the raw token, so a stolen database cannot be used to hijack sessions.
  - HTTP-only cookie helpers — keeps cookie flag logic in one place.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Response
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

# bcrypt is the industry-standard algorithm for password hashing.
# - It is slow by design, making brute-force attacks computationally expensive.
# - deprecated="auto" means passlib will automatically re-hash any password
#   stored with a weaker/deprecated scheme on next successful login.
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Hash a plaintext password using bcrypt.

    Args:
        plain_password: The raw password provided by the user.

    Returns:
        A bcrypt hash string safe to persist in the database.
    """
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a stored bcrypt hash.

    Uses a constant-time comparison internally to prevent timing attacks.

    Args:
        plain_password:   Raw password from the login form.
        hashed_password:  Hash retrieved from the database.

    Returns:
        True if the password matches, False otherwise.
    """
    return _pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT Token generation
# ---------------------------------------------------------------------------

def create_access_token(subject: str) -> str:
    """
    Generate a short-lived JWT Access Token.

    The `sub` (subject) claim holds the user's ID as a string.
    The `type` claim distinguishes this token from refresh tokens,
    preventing accidental cross-use.

    Args:
        subject: A string uniquely identifying the authenticated user (user.id).

    Returns:
        A signed JWT string.
    """
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {
        "sub": subject,
        "type": "access",
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    """
    Generate a long-lived JWT Refresh Token.

    Refresh tokens include extra entropy via the `jti` claim (JWT ID) — a random
    UUID string — ensuring that even two tokens created for the same user in the
    same second are cryptographically distinct. This is important for rotation:
    once a refresh token is consumed, the new one will have a different `jti`.

    Args:
        subject: A string uniquely identifying the authenticated user (user.id).

    Returns:
        A signed JWT string.
    """
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    payload = {
        "sub": subject,
        "type": "refresh",
        "jti": secrets.token_hex(32),  # Unique token identifier for rotation safety
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


# ---------------------------------------------------------------------------
# JWT decoding
# ---------------------------------------------------------------------------

def decode_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token.

    Validates:
      - Signature (correct secret + algorithm).
      - Expiration (`exp` claim).

    Args:
        token: The raw JWT string.

    Returns:
        The decoded payload dict if valid, or None if invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError:
        # Covers: expired tokens, bad signatures, malformed tokens.
        return None


# ---------------------------------------------------------------------------
# Refresh token hash
# ---------------------------------------------------------------------------

def hash_refresh_token(raw_token: str) -> str:
    """
    Produce a SHA-256 hex digest of a raw refresh token.

    We persist only this hash in `user_sessions.refresh_token_hash`.
    On each refresh request we re-hash the incoming token and compare it
    to the stored hash, so a stolen database dump cannot be used to
    impersonate sessions.

    Args:
        raw_token: The raw JWT refresh token string.

    Returns:
        A hex-encoded SHA-256 digest string.
    """
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

# Cookie names are defined here so they can be imported consistently
# across routes and services without magic strings scattered everywhere.
ACCESS_TOKEN_COOKIE_NAME = "access_token"
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """
    Attach both authentication cookies to an HTTP response.

    Cookie flags applied:
      - httponly=True   → JavaScript cannot read the cookie (prevents XSS theft).
      - secure=True     → Cookie only sent over HTTPS (set False for local dev via settings).
      - samesite="lax"  → Allows cookies on same-site navigations, blocks CSRF from
                          cross-origin third-party requests.

    Args:
        response:      The FastAPI Response object to attach cookies to.
        access_token:  The freshly-minted JWT access token string.
        refresh_token: The freshly-minted JWT refresh token string.
    """
    # Determine secure flag from debug setting:
    # In local development (debug=True) we allow HTTP; in production HTTPS is required.
    secure = not settings.debug

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
    )
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )


def clear_auth_cookies(response: Response) -> None:
    """
    Remove both authentication cookies from the browser on logout.

    Setting max_age=0 instructs the browser to immediately expire the cookie.

    Args:
        response: The FastAPI Response object to clear cookies on.
    """
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE_NAME, httponly=True, samesite="lax")
    response.delete_cookie(key=REFRESH_TOKEN_COOKIE_NAME, httponly=True, samesite="lax")
