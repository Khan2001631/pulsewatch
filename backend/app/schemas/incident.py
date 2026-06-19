"""
Incident Schemas.

Pydantic models for incident-related API response serialisation.

Schema hierarchy:
  - IncidentResponse: The shape returned by all incident API endpoints.

Only a response schema is needed — incidents are created and resolved
exclusively by the internal incident engine, never by direct user requests.
"""

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field, computed_field

from app.models.incident import IncidentStatus


class IncidentResponse(BaseModel):
    """
    Schema for incident data returned to the client.

    All fields map directly to columns on the `incidents` table.
    `from_attributes=True` allows building this from a SQLAlchemy ORM instance.

    Attributes:
        id:           Unique identifier for this incident.
        monitor_id:   ID of the monitor that experienced the outage.
        status:       OPEN or RESOLVED.
        reason:       Human-readable explanation of why the incident was created.
        started_at:   Timestamp of the third failure that triggered the incident.
        resolved_at:  Timestamp of the third success that resolved the incident.
                      None while the incident is still OPEN.
        duration_seconds: Elapsed time in seconds from start to resolution (or
                      to now if still OPEN). Computed on the fly; not stored.
        created_at:   UTC timestamp when the incident row was first inserted.
        updated_at:   UTC timestamp when the incident row was last changed.
    """

    id: int = Field(description="Unique identifier for this incident.")
    monitor_id: int = Field(description="ID of the monitor that experienced the outage.")
    status: IncidentStatus = Field(description="Current incident status — OPEN or RESOLVED.")
    reason: str = Field(description="Human-readable explanation for incident creation.")
    started_at: datetime = Field(
        description="Timestamp of the failure that breached the consecutive-failure threshold."
    )
    resolved_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp of resolution. Null while the incident is still OPEN.",
    )
    created_at: datetime = Field(description="UTC timestamp when the incident record was created.")
    updated_at: datetime = Field(description="UTC timestamp when the incident record was last updated.")

    @computed_field(description="Duration of the incident in seconds. Ongoing incidents use current UTC time.")  # type: ignore[misc]
    @property
    def duration_seconds(self) -> int:
        """
        Compute incident duration in whole seconds.

        - RESOLVED: resolved_at - started_at
        - OPEN: now (UTC) - started_at

        Always returns a non-negative integer.
        """
        end = self.resolved_at if self.resolved_at else datetime.now(timezone.utc)

        # Normalise both datetimes to UTC-aware before subtracting to avoid
        # TypeError when one is naive and the other is timezone-aware.
        if self.started_at.tzinfo is None:
            started = self.started_at.replace(tzinfo=timezone.utc)
        else:
            started = self.started_at

        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)

        delta = end - started
        return max(0, int(delta.total_seconds()))

    model_config = {"from_attributes": True}
