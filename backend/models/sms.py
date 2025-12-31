"""SMS-related database models for guest management and messaging."""
import uuid
from datetime import datetime, date
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Date, DateTime, Boolean, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from .wedding import Wedding


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


class Guest(Base):
    """Guest contact information for SMS communications."""
    __tablename__ = "guests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    wedding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE")
    )

    # Contact info
    name: Mapped[str] = mapped_column(String(200))
    phone_number: Mapped[str] = mapped_column(String(20))  # E.164 format: +1XXXXXXXXXX
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Grouping
    group_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # "Bride's Family", etc.

    # RSVP status
    rsvp_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, yes, no, maybe

    # SMS consent and opt-out (TCPA compliance)
    sms_consent: Mapped[bool] = mapped_column(Boolean, default=True)
    opted_out: Mapped[bool] = mapped_column(Boolean, default=False)
    opted_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    wedding: Mapped["Wedding"] = relationship("Wedding", back_populates="guests")
    message_logs: Mapped[List["MessageLog"]] = relationship(
        "MessageLog", back_populates="guest", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Guest {self.name} ({self.phone_number})>"


class SMSTemplate(Base):
    """Reusable SMS message templates with variable placeholders."""
    __tablename__ = "sms_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    wedding_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE"), nullable=True
    )  # NULL = system default template

    # Template info
    name: Mapped[str] = mapped_column(String(100))  # "Welcome", "RSVP Reminder", etc.
    content: Mapped[str] = mapped_column(Text)  # Supports {{guest_name}}, {{wedding_date}}, etc.
    category: Mapped[str] = mapped_column(String(50), default="custom")  # welcome, reminder, update, custom

    # System templates
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    wedding: Mapped[Optional["Wedding"]] = relationship("Wedding", back_populates="sms_templates")

    def __repr__(self):
        return f"<SMSTemplate {self.name}>"


class ScheduledMessage(Base):
    """Scheduled or queued SMS campaigns."""
    __tablename__ = "scheduled_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    wedding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE")
    )
    template_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("sms_templates.id", ondelete="SET NULL"), nullable=True
    )

    # Campaign info
    name: Mapped[str] = mapped_column(String(200))  # "RSVP Reminder", "Welcome Blast"
    message_content: Mapped[str] = mapped_column(Text)  # The actual message (may have variables)

    # Targeting
    recipient_type: Mapped[str] = mapped_column(String(20), default="all")  # all, group, individual
    recipient_filter: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g., {"group": "Bride's Family"} or {"guest_ids": ["uuid1", "uuid2"]}

    # Scheduling - fixed date/time
    schedule_type: Mapped[str] = mapped_column(String(20), default="fixed")  # fixed, relative
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Scheduling - relative to wedding date
    relative_to: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # wedding_date, rsvp_deadline
    relative_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # -7 = 7 days before

    # Status tracking
    status: Mapped[str] = mapped_column(String(20), default="draft")
    # draft, scheduled, sending, sent, partially_sent, failed, cancelled
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    total_recipients: Mapped[int] = mapped_column(Integer, default=0)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    wedding: Mapped["Wedding"] = relationship("Wedding", back_populates="scheduled_messages")
    template: Mapped[Optional["SMSTemplate"]] = relationship("SMSTemplate")
    message_logs: Mapped[List["MessageLog"]] = relationship(
        "MessageLog", back_populates="scheduled_message", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<ScheduledMessage {self.name} ({self.status})>"


class MessageLog(Base):
    """Individual SMS send history for tracking and debugging."""
    __tablename__ = "message_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    wedding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE")
    )
    guest_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("guests.id", ondelete="CASCADE")
    )
    scheduled_message_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("scheduled_messages.id", ondelete="SET NULL"), nullable=True
    )

    # Message details
    phone_number: Mapped[str] = mapped_column(String(20))  # E.164 format
    message_content: Mapped[str] = mapped_column(Text)

    # Twilio tracking
    twilio_sid: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="queued")
    # queued, sent, delivered, undelivered, failed
    error_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Retry tracking
    retry_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    wedding: Mapped["Wedding"] = relationship("Wedding")
    guest: Mapped["Guest"] = relationship("Guest", back_populates="message_logs")
    scheduled_message: Mapped[Optional["ScheduledMessage"]] = relationship(
        "ScheduledMessage", back_populates="message_logs"
    )

    def __repr__(self):
        return f"<MessageLog {self.phone_number} ({self.status})>"
