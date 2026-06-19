"""
User Database Model.

Represents the `users` table. Stores core account identity — email and
the bcrypt password hash. No plaintext passwords are ever persisted here.

Timestamps use `func.now()` so the database itself provides the authoritative
time, avoiding clock-skew issues between application servers.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    """
    SQLAlchemy ORM model for the `users` table.

    Attributes:
        id:            Auto-incrementing surrogate primary key.
        email:         User's unique email address (case-sensitive in storage;
                       uniqueness is enforced at the database level).
        password_hash: bcrypt hash of the user's password. Never the raw value.
        is_active:     Soft-disable flag. False = user cannot log in.
        created_at:    UTC timestamp set once at insert time by the database.
        updated_at:    UTC timestamp updated automatically on every row change.
        sessions:      Relationship to UserSession — allows `user.sessions`
                       to enumerate all login sessions for this account.
        monitors:      Relationship to Monitor — allows `user.monitors`
                       to enumerate all monitors owned by this account.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(
        String(254),  # 254 is the RFC 5321 max email length
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
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

    # One user can have many sessions (multi-device support).
    # cascade="all, delete-orphan" means sessions are deleted when the user is deleted.
    sessions: Mapped[list["UserSession"]] = relationship(  # noqa: F821
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )

    # One user can have many monitors.
    # cascade="all, delete-orphan" means monitors are deleted when the user is deleted.
    monitors: Mapped[list["Monitor"]] = relationship(  # noqa: F821
        "Monitor", back_populates="user", cascade="all, delete-orphan"
    )

    # One user can have many password reset tokens.
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(  # noqa: F821
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} active={self.is_active}>"
