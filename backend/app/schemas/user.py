"""
User Schemas.

Pydantic models for user-related request validation and response serialisation.
Keeping schemas separate from ORM models maintains a clean boundary between
the HTTP contract (what the API accepts/returns) and the database layer.
"""

import re
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# Password validation helper
# ---------------------------------------------------------------------------

def _validate_password_strength(value: str) -> str:
    """
    Enforce password complexity rules.

    Rules:
      - 8–128 characters.
      - At least one uppercase letter (A-Z).
      - At least one lowercase letter (a-z).
      - At least one numeric digit (0-9).
      - Special characters are optional.

    Raises:
        ValueError: With a descriptive message on the first failing rule.
    """
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if len(value) > 128:
        raise ValueError("Password must not exceed 128 characters.")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one numeric digit.")
    return value


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    """
    Schema for the registration request body.

    Uses Pydantic's `EmailStr` for basic email format validation (requires
    the `email-validator` package, which is already installed).
    Password strength is enforced via a field_validator.
    """

    email: EmailStr = Field(
        ...,
        description="User's email address. Must be a valid email format.",
        examples=["user@example.com"],
    )
    password: Annotated[str, Field(min_length=8, max_length=128)] = Field(
        ...,
        description="Password (8–128 chars, must include upper, lower, and digit).",
        examples=["Secure123"],
    )

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_strength(value)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    """
    Schema for user data returned to the client.

    Deliberately omits `password_hash` — sensitive fields are never
    included in outbound responses.
    `from_attributes=True` (formerly `orm_mode`) enables building this
    from a SQLAlchemy User ORM instance directly.
    """

    id: int
    email: EmailStr
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
