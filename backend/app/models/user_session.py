"""
UserSession Database Model.

Represents the `user_sessions` table. Each row tracks one active or revoked
login session, enabling multi-device support and session-level revocation.

Security design notes:
  - Only a SHA-256 hash of the refresh token is stored (`refresh_token_hash`).
    The raw token is never persisted. This means a compromised database dump
    cannot be replayed to hijack live sessions.
  - `status` uses a Python Enum mapped to a VARCHAR column so invalid states
    are rejected at the application layer before they reach the database.
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SessionStatus(str, enum.Enum):
    """
    Lifecycle states for a user session.

    Inheriting `str` means the enum values are plain strings, which
    serialises cleanly in logs, JSON responses, and comparisons.

    Values:
        ACTIVE:  Session is valid; refresh token can be used to obtain new tokens.
        REVOKED: Session was explicitly ended (logout) and must not be used again.
    """

    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"


class UserSession(Base):
    """
    SQLAlchemy ORM model for the `user_sessions` table.

    Attributes:
        id:                   Auto-incrementing surrogate primary key.
        user_id:              Foreign key back to `users.id`.
                              Cascade deletes ensure sessions are cleaned up
                              when a user account is removed.
        refresh_token_hash:   SHA-256 hex digest of the current refresh token.
                              Updated on every successful rotation.
        status:               ACTIVE or REVOKED. Checked on every refresh request.
        created_at:           UTC timestamp when the session was first created (login).
        last_used_at:         UTC timestamp updated on every successful token refresh.
                              Useful for audit logs and idle-session expiry.
        expires_at:           Hard expiry derived from the refresh token's `exp` claim.
                              Allows the DB to be queried for expired sessions to purge.
        user:                 Back-reference to the owning User.
    """

    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # We store 64 hex chars (SHA-256 produces 32 bytes = 64 hex chars).
    refresh_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    status: Mapped[SessionStatus] = mapped_column(
        # native_enum=False stores the value as a VARCHAR, avoiding the need
        # to create a PostgreSQL ENUM type, which is harder to migrate later.
        Enum(SessionStatus, native_enum=False),
        default=SessionStatus.ACTIVE,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Relationship back to User for convenient access (e.g. session.user.email).
    user: Mapped["User"] = relationship("User", back_populates="sessions")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<UserSession id={self.id} user_id={self.user_id} status={self.status}>"
        )
