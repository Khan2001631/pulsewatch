"""
Monitor Database Model.

Represents the `monitors` table. Each row stores the configuration for one
website or API endpoint that PulseWatch will monitor.

Design notes:
  - `method` uses a Python Enum mapped to a VARCHAR column (native_enum=False)
    so that adding new methods in the future is a simple migration rather than
    a PostgreSQL ENUM type alteration.
  - `user_id` has an `ondelete="CASCADE"` constraint so that a user's monitors
    are automatically removed when the user account is deleted at the DB level.
  - Timestamps use `func.now()` so the database provides authoritative time,
    avoiding clock-skew issues between application servers.
"""

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class HTTPMethod(str, enum.Enum):
    """
    Supported HTTP methods for a monitor's health check request.

    Inheriting `str` means values are plain strings, which serialises
    cleanly in JSON responses, logs, and Pydantic schema output.

    Values:
        GET:    Standard read request. Most common for health checks.
        POST:   Submit data; useful for API endpoints that require a payload.
        PUT:    Full resource replacement endpoint checks.
        PATCH:  Partial update endpoint checks.
        DELETE: Deletion endpoint checks.
    """

    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"
    DELETE = "DELETE"


class Monitor(Base):
    """
    SQLAlchemy ORM model for the `monitors` table.

    Attributes:
        id:                     Auto-incrementing surrogate primary key.
        user_id:                Foreign key to `users.id`. Identifies the owner.
                                Cascade deletes ensure monitors are removed when
                                the user account is deleted.
        name:                   Human-readable label for the monitor (e.g. "Production API").
                                Maximum 100 characters.
        url:                    The full URL to be checked (e.g. https://api.example.com/health).
                                Maximum 2048 characters to accommodate long URLs.
        method:                 HTTP method to use when performing the check.
                                Stored as a VARCHAR using the HTTPMethod enum.
        expected_status_code:   The HTTP status code that indicates a healthy response
                                (e.g. 200, 201, 204). Must be a valid HTTP status code.
        check_interval_seconds: How frequently to run the check, in seconds (e.g. 60).
                                Must be greater than zero.
        is_active:              Soft-disable flag. False = monitoring is paused.
                                Allows users to disable without deleting.
        created_at:             UTC timestamp set once at insert time by the database.
        updated_at:             UTC timestamp updated automatically on every row change.
        user:                   Relationship back to the owning User instance.
    """

    __tablename__ = "monitors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)

    # 2048 chars covers even the longest realistic API URLs with query params.
    url: Mapped[str] = mapped_column(String(2048), nullable=False)

    method: Mapped[HTTPMethod] = mapped_column(
        # native_enum=False stores the value as a VARCHAR, avoiding the need to
        # create a PostgreSQL ENUM type, which is harder to migrate later.
        Enum(HTTPMethod, native_enum=False),
        nullable=False,
        default=HTTPMethod.GET,
    )

    # Valid HTTP status codes range from 100 to 599.
    expected_status_code: Mapped[int] = mapped_column(Integer, nullable=False, default=200)

    # How often to run the check. Minimum value of 1 is enforced at schema level.
    check_interval_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=60)

    # When False, the scheduler will skip this monitor without deleting it.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # server_default ensures the DB sets this value on INSERT even if
    # the application layer forgets to supply it.
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

    # Back-reference to the owning user for convenient access (e.g. monitor.user.email).
    user: Mapped["User"] = relationship("User", back_populates="monitors")  # noqa: F821

    # One-to-many: all health check results recorded for this monitor.
    health_checks: Mapped[list["HealthCheck"]] = relationship(  # noqa: F821
        "HealthCheck",
        back_populates="monitor",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # One-to-many: all incidents raised for this monitor.
    incidents: Mapped[list["Incident"]] = relationship(  # noqa: F821
        "Incident",
        back_populates="monitor",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return (
            f"<Monitor id={self.id} name={self.name!r} "
            f"url={self.url!r} active={self.is_active}>"
        )
