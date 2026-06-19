"""
HealthCheck Database Model.

Represents the `health_checks` table. Each row records the outcome of a
single monitoring attempt against a specific Monitor.

Design notes:
  - `monitor_id` uses `ondelete="CASCADE"` so that all check records are
    automatically purged when the parent monitor is deleted, keeping the DB
    clean without application-level cleanup.
  - `status` is stored as a VARCHAR (native_enum=False) for forward
    compatibility, consistent with the HTTPMethod pattern in Monitor.
  - `status_code`, `response_time_ms`, and `error_message` are all nullable
    to accommodate network-level failures where no HTTP response is received.
  - `checked_at` is set by the database via `server_default` so that the
    timestamp is authoritative even if the application clock drifts.
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CheckStatus(str, enum.Enum):
    """
    Outcome of a single health check attempt.

    Inheriting `str` means the value serialises cleanly in JSON without
    needing a custom serialiser.

    Values:
        SUCCESS: The HTTP response code matched the monitor's expected code.
        FAILURE: The response code did not match, the request timed out,
                 or a network/DNS error prevented the request from completing.
    """

    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"


class HealthCheck(Base):
    """
    SQLAlchemy ORM model for the `health_checks` table.

    Attributes:
        id:               Auto-incrementing surrogate primary key.
        monitor_id:       Foreign key to `monitors.id`. Cascade-deleted when
                          the parent monitor is removed.
        status:           Overall outcome — SUCCESS or FAILURE.
        status_code:      HTTP status code returned by the target server.
                          NULL when no response was received (e.g. timeout).
        response_time_ms: Round-trip time for the HTTP request, in milliseconds.
                          NULL when the request did not complete.
        error_message:    Human-readable reason for a FAILURE when no HTTP
                          response was received (e.g. "Connection timed out").
                          NULL on SUCCESS or when a status code mismatch caused
                          the failure (the code is informative enough).
        checked_at:       UTC timestamp recorded by the database at insert time.
        monitor:          Relationship back to the parent Monitor instance.
    """

    __tablename__ = "health_checks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    monitor_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("monitors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[CheckStatus] = mapped_column(
        # native_enum=False stores the value as VARCHAR, matching the HTTPMethod pattern.
        Enum(CheckStatus, native_enum=False),
        nullable=False,
    )

    # NULL when no HTTP response was received (e.g. network error / timeout).
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # NULL when the request did not complete at all.
    response_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Text column for potentially long error messages from httpx exceptions.
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # server_default guarantees the DB sets this even if the app forgets.
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Back-reference to the owning Monitor for convenient access.
    monitor: Mapped["Monitor"] = relationship("Monitor", back_populates="health_checks")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<HealthCheck id={self.id} monitor_id={self.monitor_id} "
            f"status={self.status} status_code={self.status_code}>"
        )
