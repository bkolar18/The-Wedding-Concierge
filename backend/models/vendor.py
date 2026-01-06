"""Vendor management database models."""
import uuid
from datetime import datetime, date
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Date, DateTime, Boolean, ForeignKey, JSON, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from .wedding import Wedding


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


# Vendor categories enum-like constants
VENDOR_CATEGORIES = [
    "venue",
    "catering",
    "photography",
    "videography",
    "florist",
    "dj_band",
    "officiant",
    "hair_makeup",
    "cake_desserts",
    "transportation",
    "rentals",
    "lighting_av",
    "photo_booth",
    "stationery",
    "planner_coordinator",
    "other",
]

# Vendor status constants
VENDOR_STATUSES = [
    "inquiry",      # Initial contact
    "quoted",       # Received quote
    "deposit_paid", # Deposit paid, booked
    "booked",       # Fully confirmed
    "completed",    # Service delivered
    "cancelled",    # Cancelled
]


class Vendor(Base):
    """Vendor contact and service information for a wedding."""
    __tablename__ = "vendors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    wedding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE")
    )

    # Business info
    business_name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50))  # See VENDOR_CATEGORIES
    contact_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Contact details
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    instagram_handle: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status and booking
    status: Mapped[str] = mapped_column(String(20), default="inquiry")  # See VENDOR_STATUSES
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Contract details
    contract_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    deposit_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    deposit_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    deposit_paid_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Service details
    service_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    service_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    arrival_time: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    end_time: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # For vendor portal access (Phase 2)
    portal_access_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    portal_access_token: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    wedding: Mapped["Wedding"] = relationship("Wedding", back_populates="vendors")
    payments: Mapped[List["VendorPayment"]] = relationship(
        "VendorPayment", back_populates="vendor", cascade="all, delete-orphan"
    )
    documents: Mapped[List["VendorDocument"]] = relationship(
        "VendorDocument", back_populates="vendor", cascade="all, delete-orphan"
    )
    communications: Mapped[List["VendorCommunication"]] = relationship(
        "VendorCommunication", back_populates="vendor", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Vendor {self.business_name} ({self.category})>"

    @property
    def total_paid(self) -> float:
        """Calculate total amount paid to this vendor."""
        return sum(p.amount for p in self.payments if p.status == "paid")

    @property
    def balance_due(self) -> float:
        """Calculate remaining balance due."""
        if self.contract_amount is None:
            return 0.0
        return float(self.contract_amount) - self.total_paid


# Payment type constants
PAYMENT_TYPES = [
    "deposit",
    "installment",
    "final",
    "tip",
    "refund",
    "other",
]

# Payment status constants
PAYMENT_STATUSES = [
    "pending",
    "paid",
    "overdue",
    "cancelled",
]


class VendorPayment(Base):
    """Payment tracking for vendors."""
    __tablename__ = "vendor_payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    vendor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vendors.id", ondelete="CASCADE")
    )
    wedding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE")
    )

    # Payment details
    payment_type: Mapped[str] = mapped_column(String(20), default="installment")  # See PAYMENT_TYPES
    description: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2))

    # Dates
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    paid_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending")  # See PAYMENT_STATUSES

    # Payment method tracking
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # e.g., "credit_card", "check", "bank_transfer", "cash", "venmo", "zelle"
    confirmation_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Reminder tracking
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="payments")
    wedding: Mapped["Wedding"] = relationship("Wedding")

    def __repr__(self):
        return f"<VendorPayment ${self.amount} ({self.status})>"


# Document type constants
DOCUMENT_TYPES = [
    "contract",
    "invoice",
    "receipt",
    "insurance",
    "license",
    "w9",
    "quote",
    "proposal",
    "other",
]


class VendorDocument(Base):
    """Document storage for vendor contracts, invoices, etc."""
    __tablename__ = "vendor_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    vendor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vendors.id", ondelete="CASCADE")
    )
    wedding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE")
    )

    # Document info
    document_type: Mapped[str] = mapped_column(String(20), default="other")  # See DOCUMENT_TYPES
    name: Mapped[str] = mapped_column(String(200))  # Display name
    file_name: Mapped[str] = mapped_column(String(255))  # Original filename
    file_url: Mapped[str] = mapped_column(String(500))  # Cloud storage URL
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Size in bytes
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Contract-specific fields
    is_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    signed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Insurance/license expiration tracking
    expiration_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiration_reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="documents")
    wedding: Mapped["Wedding"] = relationship("Wedding")

    def __repr__(self):
        return f"<VendorDocument {self.name} ({self.document_type})>"


# Communication type constants
COMMUNICATION_TYPES = [
    "email",
    "phone",
    "text",
    "meeting",
    "video_call",
    "note",
    "other",
]


class VendorCommunication(Base):
    """Communication log for vendor interactions."""
    __tablename__ = "vendor_communications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    vendor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vendors.id", ondelete="CASCADE")
    )
    wedding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weddings.id", ondelete="CASCADE")
    )

    # Communication details
    communication_type: Mapped[str] = mapped_column(String(20), default="note")  # See COMMUNICATION_TYPES
    direction: Mapped[str] = mapped_column(String(10), default="outbound")  # inbound, outbound
    subject: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    content: Mapped[str] = mapped_column(Text)

    # Follow-up tracking
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    follow_up_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Attachments (JSON array of file URLs)
    attachments: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="communications")
    wedding: Mapped["Wedding"] = relationship("Wedding")

    def __repr__(self):
        return f"<VendorCommunication {self.communication_type} ({self.created_at.date()})>"
