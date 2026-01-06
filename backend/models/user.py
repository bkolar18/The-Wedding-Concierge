"""User model for couples managing their weddings."""
import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


def generate_reset_token() -> str:
    """Generate a secure password reset token."""
    return secrets.token_urlsafe(32)


class User(Base):
    """User account for couples to manage their wedding."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Link to their wedding
    wedding_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="SET NULL"), nullable=True
    )

    # Account status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Payment/Subscription info
    subscription_tier: Mapped[str] = mapped_column(String(20), default="free")  # free, standard, premium
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    stripe_payment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # For one-time payments
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    payment_amount_cents: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Amount paid in cents

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def __repr__(self):
        return f"<User {self.email}>"


class PasswordResetToken(Base):
    """Token for password reset requests."""
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, default=generate_reset_token)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    @property
    def is_valid(self) -> bool:
        """Check if token is still valid."""
        return self.used_at is None and datetime.utcnow() < self.expires_at

    def __repr__(self):
        return f"<PasswordResetToken {self.id}>"
