"""
Monitor Schemas.

Pydantic models for monitor-related request validation and response serialisation.

Schema hierarchy:
  - MonitorBase:    Shared fields and validators used by all monitor schemas.
  - MonitorCreate:  Request body for POST /monitors (all required fields).
  - MonitorUpdate:  Request body for PUT /monitors/{id} (all fields optional).
  - MonitorResponse: Response body returned from all monitor endpoints.

Keeping schemas separate from ORM models maintains a clean boundary between
the HTTP contract (what the API accepts/returns) and the database layer.
"""

from datetime import datetime
from typing import Annotated, Optional

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator

from app.models.monitor import HTTPMethod


# ---------------------------------------------------------------------------
# Shared base
# ---------------------------------------------------------------------------

class MonitorBase(BaseModel):
    """
    Shared fields and validation rules for all monitor schemas.

    Validation rules:
      - name:                   Required. 1–100 characters.
      - url:                    Must be a valid HTTP/HTTPS URL.
      - method:                 Must be one of GET, POST, PUT, PATCH, DELETE.
      - expected_status_code:   Must be a valid HTTP status code (100–599).
      - check_interval_seconds: Must be greater than 0.
      - is_active:              Defaults to True.
    """

    name: Annotated[str, Field(min_length=1, max_length=100)] = Field(
        ...,
        description="Human-readable label for this monitor.",
        examples=["Production API"],
    )

    url: AnyHttpUrl = Field(
        ...,
        description="The full URL to monitor (must be a valid HTTP/HTTPS URL).",
        examples=["https://api.example.com/health"],
    )

    method: HTTPMethod = Field(
        default=HTTPMethod.GET,
        description="HTTP method to use when performing the health check.",
        examples=["GET"],
    )

    expected_status_code: int = Field(
        default=200,
        description="HTTP status code that indicates a healthy response.",
        examples=[200, 201, 204],
    )

    check_interval_seconds: int = Field(
        default=60,
        gt=0,
        description="How often to run the check, in seconds. Must be greater than 0.",
        examples=[60, 300, 600],
    )

    is_active: bool = Field(
        default=True,
        description="Whether this monitor is actively checked. Set to False to pause without deleting.",
    )

    @field_validator("expected_status_code")
    @classmethod
    def validate_status_code(cls, value: int) -> int:
        """
        Validate that `expected_status_code` is a real HTTP status code.

        Valid HTTP status codes range from 100 (informational) to 599 (server error).
        Codes outside this range are not defined by any RFC and are rejected.

        Raises:
            ValueError: If the value is not in the 100–599 range.
        """
        if not (100 <= value <= 599):
            raise ValueError(
                f"expected_status_code must be a valid HTTP status code (100–599), got {value}."
            )
        return value


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class MonitorCreate(MonitorBase):
    """
    Schema for the create monitor request body (POST /monitors).

    Inherits all fields and validators from MonitorBase.
    All fields except `is_active`, `method`, `expected_status_code`,
    and `check_interval_seconds` are required.
    """

    pass


class MonitorUpdate(BaseModel):
    """
    Schema for the update monitor request body (PUT /monitors/{id}).

    All fields are optional to support partial updates — only the supplied
    fields are updated on the existing monitor record.
    """

    name: Annotated[Optional[str], Field(min_length=1, max_length=100)] = Field(
        default=None,
        description="New human-readable label for this monitor.",
        examples=["Production API v2"],
    )

    url: Optional[AnyHttpUrl] = Field(
        default=None,
        description="New URL to monitor.",
        examples=["https://api.example.com/v2/health"],
    )

    method: Optional[HTTPMethod] = Field(
        default=None,
        description="New HTTP method for the health check.",
    )

    expected_status_code: Optional[int] = Field(
        default=None,
        description="New expected HTTP status code.",
    )

    check_interval_seconds: Optional[int] = Field(
        default=None,
        gt=0,
        description="New check interval in seconds. Must be greater than 0.",
    )

    is_active: Optional[bool] = Field(
        default=None,
        description="Set to False to pause monitoring without deleting.",
    )

    @field_validator("expected_status_code", mode="before")
    @classmethod
    def validate_status_code(cls, value: Optional[int]) -> Optional[int]:
        """
        Validate `expected_status_code` only when a value is actually provided.

        Raises:
            ValueError: If the provided value is not in the 100–599 range.
        """
        if value is not None and not (100 <= value <= 599):
            raise ValueError(
                f"expected_status_code must be a valid HTTP status code (100–599), got {value}."
            )
        return value


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class MonitorResponse(MonitorBase):
    """
    Schema for monitor data returned to the client.

    Extends MonitorBase with server-assigned fields: id, user_id, and timestamps.
    `from_attributes=True` enables building this from a SQLAlchemy Monitor
    ORM instance directly, without manual field mapping.

    Note: `url` is serialised back to a plain string for clean JSON output.
    """

    id: int = Field(description="Unique identifier for this monitor.")
    user_id: int = Field(description="ID of the user who owns this monitor.")
    created_at: datetime = Field(description="UTC timestamp when this monitor was created.")
    updated_at: datetime = Field(description="UTC timestamp when this monitor was last updated.")

    model_config = {"from_attributes": True}
