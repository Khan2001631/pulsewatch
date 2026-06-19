"""
Password Reset Token Model.

Stores hashed password reset tokens to allow users to securely recover their accounts.
Tokens are single-use and automatically expire.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PasswordResetToken(Base):
    """
    SQLAlchemy ORM model for the `password_reset_tokens` table.

    Attributes:
        id:          Auto-incrementing primary key.
        user_id:     Foreign key to the users table.
        token_hash:  SHA-256 hash of the securely generated random token.
        expires_at:  When the token becomes invalid.
        used_at:     When the token was consumed. If set, it cannot be used again.
        created_at:  Timestamp when the token was issued.
        user:        Relationship to the User model.
    """

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship to user
    user: Mapped["User"] = relationship("User", back_populates="password_reset_tokens")  # noqa: F821

    def __repr__(self) -> str:
        return f"<PasswordResetToken id={self.id} user_id={self.user_id} used={self.used_at is not None}>"
