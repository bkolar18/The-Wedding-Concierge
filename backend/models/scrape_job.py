"""Scrape job model for background wedding website scraping."""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from core.database import Base


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


class ScrapeJobStatus(str, enum.Enum):
    """Status of a scrape job."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ScrapeJob(Base):
    """Background scrape job for wedding websites."""
    __tablename__ = "scrape_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)

    # Job info
    url: Mapped[str] = mapped_column(Text)
    status: Mapped[ScrapeJobStatus] = mapped_column(
        Enum(ScrapeJobStatus),
        default=ScrapeJobStatus.PENDING
    )

    # Progress tracking
    progress: Mapped[int] = mapped_column(default=0)  # 0-100
    message: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Results (stored when completed)
    platform: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    scraped_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    preview_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Error info (if failed)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
