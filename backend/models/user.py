"""User model for couples managing their weddings."""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


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

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def __repr__(self):
        return f"<User {self.email}>"
