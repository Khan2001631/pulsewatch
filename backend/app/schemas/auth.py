"""
Authentication Schemas.

Pydantic models for authentication-specific requests and responses.
Separating these from the general user schemas keeps each file focused
on a single responsibility.
"""

from typing import Annotated
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import _validate_password_strength


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    """Schema for the forgot password request."""
    email: EmailStr = Field(
        ...,
        description="Registered user email address.",
        examples=["user@example.com"],
    )

class ResetPasswordRequest(BaseModel):
    """Schema for the reset password request."""
    token: str = Field(
        ...,
        description="The secure reset token received via email.",
    )
    new_password: Annotated[str, Field(min_length=8, max_length=128)] = Field(
        ...,
        description="New password (8–128 chars, must include upper, lower, and digit).",
        examples=["Secure123"],
    )

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_strength(value)

class LoginRequest(BaseModel):
    """
    Schema for the login request body.

    We accept the email and password directly as JSON.  Credentials are
    validated at the schema level (format) and then verified against the
    database inside the service layer.
    """

    email: EmailStr = Field(
        ...,
        description="Registered user email address.",
        examples=["user@example.com"],
    )
    password: str = Field(
        ...,
        min_length=1,
        description="User password.",
        examples=["Secure123"],
    )


# ---------------------------------------------------------------------------
# Internal / utility schemas
# ---------------------------------------------------------------------------

class TokenPayload(BaseModel):
    """
    Represents the decoded payload of a JWT token.

    Used internally by the service layer when decoding tokens — not exposed
    directly in API responses.

    Attributes:
        sub:  Subject — the user's ID as a string.
        type: Token type identifier ("access" or "refresh").
    """

    sub: str
    type: str


# ---------------------------------------------------------------------------
# Generic response schemas
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    """
    Simple message envelope for endpoints that only need to confirm an action.

    Used by logout and other status-only responses so the client has a
    consistent, parseable response body rather than an empty 204.
    """

    message: str
