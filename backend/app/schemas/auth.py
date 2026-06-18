"""
Authentication Schemas.

Pydantic models for authentication-specific requests and responses.
Separating these from the general user schemas keeps each file focused
on a single responsibility.
"""

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

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
