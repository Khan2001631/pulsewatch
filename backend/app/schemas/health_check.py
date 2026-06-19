"""
HealthCheck Schemas.

Pydantic models for health-check-related response serialisation.

Schema hierarchy:
  - HealthCheckResponse: The shape returned by all health check API endpoints.

Only a response schema is needed for this model — health checks are created
exclusively by the internal scheduler, never by direct user requests.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.health_check import CheckStatus


class HealthCheckResponse(BaseModel):
    """
    Schema for health check data returned to the client.

    All fields map directly to columns on the `health_checks` table.
    `from_attributes=True` allows building this from a SQLAlchemy ORM instance.

    Attributes:
        id:               Unique identifier for this health check record.
        monitor_id:       ID of the monitor that was checked.
        status:           SUCCESS or FAILURE.
        status_code:      HTTP status code from the server, or None if the
                          request never completed (timeout / network error).
        response_time_ms: Round-trip time in milliseconds, or None if the
                          request never completed.
        error_message:    Human-readable failure reason for non-HTTP errors
                          (e.g. "Connection timed out"). None on SUCCESS.
        checked_at:       UTC timestamp when the check was executed.
    """

    id: int = Field(description="Unique identifier for this health check record.")
    monitor_id: int = Field(description="ID of the monitor that was checked.")
    status: CheckStatus = Field(description="Outcome of the health check — SUCCESS or FAILURE.")
    status_code: Optional[int] = Field(
        default=None,
        description="HTTP status code returned by the server. Null if no response was received.",
    )
    response_time_ms: Optional[int] = Field(
        default=None,
        description="Round-trip response time in milliseconds. Null if the request did not complete.",
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Reason for failure when no HTTP response was received. Null on success.",
    )
    checked_at: datetime = Field(description="UTC timestamp when this check was executed.")

    model_config = {"from_attributes": True}
