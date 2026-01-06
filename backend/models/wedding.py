"""Wedding-related database models."""
import uuid
from datetime import datetime, date
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Date, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from .chat import ChatSession
    from .sms import Guest, SMSTemplate, ScheduledMessage
    from .vendor import Vendor


import re


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


def generate_slug(partner1_name: str, partner2_name: str) -> str:
    """Generate a URL-friendly slug from partner names.

    Examples:
        "Alice Smith", "Bob Jones" -> "alice-and-bob"
        "María García", "José López" -> "maria-and-jose"
    """
    # Extract first names (first word of each name)
    first1 = partner1_name.split()[0] if partner1_name else "partner1"
    first2 = partner2_name.split()[0] if partner2_name else "partner2"

    # Combine with "and"
    combined = f"{first1}-and-{first2}"

    # Lowercase and remove accents/special chars
    slug = combined.lower()
    # Replace accented characters with ASCII equivalents
    replacements = {
        'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a',
        'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
        'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
        'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o',
        'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
        'ñ': 'n', 'ç': 'c',
    }
    for old, new in replacements.items():
        slug = slug.replace(old, new)

    # Remove any remaining non-alphanumeric characters except hyphens
    slug = re.sub(r'[^a-z0-9-]', '', slug)

    # Remove multiple consecutive hyphens
    slug = re.sub(r'-+', '-', slug)

    return slug


class Wedding(Base):
    """Main wedding record containing all wedding details."""
    __tablename__ = "weddings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)

    # Couple info
    partner1_name: Mapped[str] = mapped_column(String(100))
    partner2_name: Mapped[str] = mapped_column(String(100))
    couple_email: Mapped[str] = mapped_column(String(255), unique=True)

    # Wedding basics
    wedding_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    wedding_time: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    dress_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Can be long descriptions

    # Venue info
    ceremony_venue_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    ceremony_venue_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ceremony_venue_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    reception_venue_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    reception_venue_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reception_venue_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    reception_time: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Registry
    registry_urls: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # External links
    wedding_website_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    rsvp_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    rsvp_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # For relative SMS scheduling

    # Additional info
    additional_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Scraped data (raw JSON from wedding website)
    scraped_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    last_scraped_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Access control
    access_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Public registration slug (e.g., "smith-jones" for /join/smith-jones)
    slug: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True, index=True)

    # Chat customization
    chat_greeting: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Custom welcome message for chat
    show_branding: Mapped[bool] = mapped_column(Boolean, default=True)  # Show "Powered by" branding (premium can disable)

    # Relationships
    events: Mapped[List["WeddingEvent"]] = relationship(
        "WeddingEvent", back_populates="wedding", cascade="all, delete-orphan"
    )
    accommodations: Mapped[List["WeddingAccommodation"]] = relationship(
        "WeddingAccommodation", back_populates="wedding", cascade="all, delete-orphan"
    )
    faqs: Mapped[List["WeddingFAQ"]] = relationship(
        "WeddingFAQ", back_populates="wedding", cascade="all, delete-orphan"
    )
    chat_sessions: Mapped[List["ChatSession"]] = relationship(
        "ChatSession", back_populates="wedding", cascade="all, delete-orphan"
    )

    # SMS-related relationships
    guests: Mapped[List["Guest"]] = relationship(
        "Guest", back_populates="wedding", cascade="all, delete-orphan"
    )
    sms_templates: Mapped[List["SMSTemplate"]] = relationship(
        "SMSTemplate", back_populates="wedding", cascade="all, delete-orphan"
    )
    scheduled_messages: Mapped[List["ScheduledMessage"]] = relationship(
        "ScheduledMessage", back_populates="wedding", cascade="all, delete-orphan"
    )

    # Vendor management relationships
    vendors: Mapped[List["Vendor"]] = relationship(
        "Vendor", back_populates="wedding", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Wedding {self.partner1_name} & {self.partner2_name}>"


class WeddingEvent(Base):
    """Individual events within a wedding (rehearsal dinner, brunch, etc.)."""
    __tablename__ = "wedding_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    wedding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE")
    )

    event_name: Mapped[str] = mapped_column(String(200))
    event_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    event_time: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    venue_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    venue_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    venue_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dress_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Can be long descriptions

    # Relationships
    wedding: Mapped["Wedding"] = relationship("Wedding", back_populates="events")


class WeddingAccommodation(Base):
    """Hotels and accommodations with room blocks."""
    __tablename__ = "wedding_accommodations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    wedding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE")
    )

    hotel_name: Mapped[str] = mapped_column(String(200))
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    booking_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Room block details
    has_room_block: Mapped[bool] = mapped_column(Boolean, default=False)
    room_block_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    room_block_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    room_block_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    room_block_rate: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Distance from venue
    distance_to_venue: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    wedding: Mapped["Wedding"] = relationship("Wedding", back_populates="accommodations")


class WeddingFAQ(Base):
    """Frequently asked questions and answers."""
    __tablename__ = "wedding_faqs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    wedding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE")
    )

    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    display_order: Mapped[int] = mapped_column(default=0)

    # Relationships
    wedding: Mapped["Wedding"] = relationship("Wedding", back_populates="faqs")
