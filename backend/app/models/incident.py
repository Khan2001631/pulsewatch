"""
Incident Database Model.

Represents the `incidents` table. Each row records a detected outage for
a specific monitor — created when consecutive health check failures breach
the configured threshold, and resolved when consecutive successes follow.

Design notes:
  - `monitor_id` uses `ondelete="CASCADE"` so that all incident records are
    automatically purged when the parent monitor is deleted.
  - `status` is stored as a VARCHAR (native_enum=False) for forward
    compatibility, consistent with the HTTPMethod / CheckStatus pattern.
  - Only ONE incident with status OPEN may exist per monitor at any time.
    This uniqueness rule is enforced at the service layer, not the DB level,
    to provide a clear error path and avoid constraint-collision exceptions.
  - `started_at` records when the threshold-breaching (third) failure occurred,
    not when the incident row was inserted.
  - `resolved_at` is NULL while the incident is OPEN and is set to the
    timestamp of the third consecutive SUCCESS that resolved the incident.
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class IncidentStatus(str, enum.Enum):
    """
    Lifecycle state of an incident.

    Inheriting `str` means the value serialises cleanly in JSON without
    needing a custom serialiser — consistent with CheckStatus and HTTPMethod.

    Values:
        OPEN:     The outage is ongoing. No resolving successes yet.
        RESOLVED: The service recovered; 3 consecutive successes were recorded.
    """

    OPEN = "OPEN"
    RESOLVED = "RESOLVED"


class Incident(Base):
    """
    SQLAlchemy ORM model for the `incidents` table.

    Attributes:
        id:          Auto-incrementing surrogate primary key.
        monitor_id:  Foreign key to `monitors.id`. Cascade-deleted when the
                     parent monitor is removed.
        status:      OPEN or RESOLVED. Only one OPEN incident allowed per monitor.
        reason:      Human-readable explanation of why the incident was created
                     (e.g. "3 consecutive failed health checks").
        started_at:  Timestamp of the third (threshold-breaching) failure that
                     triggered incident creation.
        resolved_at: Timestamp of the third consecutive success that resolved the
                     incident. NULL while the incident is still OPEN.
        created_at:  UTC timestamp set once at insert time by the database.
        updated_at:  UTC timestamp updated automatically on every row change.
        monitor:     Relationship back to the parent Monitor instance.
    """

    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    monitor_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("monitors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[IncidentStatus] = mapped_column(
        # native_enum=False stores the value as VARCHAR, matching the existing pattern.
        Enum(IncidentStatus, native_enum=False),
        nullable=False,
        default=IncidentStatus.OPEN,
    )

    # Static reason string for the initial implementation.
    reason: Mapped[str] = mapped_column(String(500), nullable=False)

    # Timestamp of the third consecutive failure that breached the threshold.
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # NULL while the incident is OPEN; set when resolved.
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # server_default ensures the DB sets this on INSERT even if the app forgets.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # onupdate keeps updated_at in sync whenever any column on this row changes.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Back-reference to the owning Monitor for convenient access.
    monitor: Mapped["Monitor"] = relationship("Monitor", back_populates="incidents")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<Incident id={self.id} monitor_id={self.monitor_id} "
            f"status={self.status} started_at={self.started_at}>"
        )
