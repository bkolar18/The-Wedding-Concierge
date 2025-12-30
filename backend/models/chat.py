"""Chat session and message models."""
import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from core.database import Base

if TYPE_CHECKING:
    from .wedding import Wedding


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


class MessageRole(enum.Enum):
    """Role of the message sender."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatSession(Base):
    """A chat session with a guest."""
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    wedding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE")
    )

    # Guest identifier (could be phone number for SMS or session ID for web)
    guest_identifier: Mapped[str] = mapped_column(String(255))
    guest_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Channel
    channel: Mapped[str] = mapped_column(String(20), default="web")
    # "web" or "sms"

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    wedding: Mapped["Wedding"] = relationship("Wedding", back_populates="chat_sessions")
    messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan",
        order_by="ChatMessage.created_at"
    )

    def __repr__(self):
        return f"<ChatSession {self.guest_identifier}>"


class ChatMessage(Base):
    """Individual message in a chat session."""
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE")
    )

    role: Mapped[str] = mapped_column(String(20))  # user, assistant, system
    content: Mapped[str] = mapped_column(Text)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")

    def __repr__(self):
        return f"<ChatMessage {self.role}: {self.content[:50]}...>"
