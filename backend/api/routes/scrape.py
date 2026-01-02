"""Wedding website scraping API endpoints."""
import re
import socket
import ipaddress
import logging
import asyncio
from typing import Optional
from urllib.parse import urlparse
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, HttpUrl

from services.scraper import WeddingScraper
from services.scraper.data_mapper import WeddingDataMapper
from core.auth import get_current_user_optional
from core.database import async_session_maker
from models.scrape_job import ScrapeJob, ScrapeJobStatus

logger = logging.getLogger(__name__)

# Optional auth - doesn't require login but accepts token if provided
security = HTTPBearer(auto_error=False)

# Allowed wedding website domains (whitelist approach)
ALLOWED_DOMAINS = [
    "theknot.com",
    "zola.com",
    "withjoy.com",
    "weddingwire.com",
    "minted.com",
    "wedding.com",
    "joykitchen.com",
    "theblacktiebride.com",
    "squarespace.com",
    "weddingwebsite.com",
    "wix.com",
    "weebly.com",
]


def is_private_ip(ip: str) -> bool:
    """Check if an IP address is private/internal."""
    try:
        ip_obj = ipaddress.ip_address(ip)
        return (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_reserved
            or ip_obj.is_multicast
        )
    except ValueError:
        return False


def validate_url_for_ssrf(url: str) -> tuple[bool, str]:
    """
    Validate a URL to prevent SSRF attacks.

    Returns (is_valid, error_message)
    """
    try:
        parsed = urlparse(url)

        # Check scheme
        if parsed.scheme not in ("http", "https"):
            return False, "Only HTTP and HTTPS URLs are allowed"

        # Get hostname
        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid URL: no hostname"

        # Block localhost and common internal hostnames
        blocked_hostnames = [
            "localhost",
            "127.0.0.1",
            "0.0.0.0",
            "::1",
            "metadata.google.internal",  # Cloud metadata
            "169.254.169.254",  # AWS/GCP metadata
            "metadata",
        ]
        if hostname.lower() in blocked_hostnames:
            return False, "Access to internal resources is not allowed"

        # Check if hostname is an IP address
        try:
            ip_obj = ipaddress.ip_address(hostname)
            if is_private_ip(hostname):
                return False, "Access to private IP addresses is not allowed"
        except ValueError:
            # Not an IP address, resolve and check
            try:
                # Resolve hostname to check for private IPs
                resolved_ips = socket.getaddrinfo(hostname, None)
                for result in resolved_ips:
                    ip = result[4][0]
                    if is_private_ip(ip):
                        logger.warning(f"SSRF attempt: {hostname} resolves to private IP {ip}")
                        return False, "Access to private IP addresses is not allowed"
            except socket.gaierror:
                return False, f"Could not resolve hostname: {hostname}"

        # Optional: Check against allowed domains (whitelist approach)
        # This is a safer but more restrictive approach
        domain = hostname.lower()
        is_allowed = any(
            domain == allowed or domain.endswith("." + allowed)
            for allowed in ALLOWED_DOMAINS
        )

        if not is_allowed:
            logger.info(f"Allowing non-whitelisted domain: {domain}")
            # For now, allow non-whitelisted domains but log them
            # In stricter mode, you could return False here

        return True, ""

    except Exception as e:
        return False, f"Invalid URL: {str(e)}"


def parse_date(date_str: Optional[str]) -> Optional[date]:
    """Parse a date string into a Python date object."""
    if not date_str:
        return None
    try:
        # Try YYYY-MM-DD format first
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        pass
    try:
        # Try MM/DD/YYYY format
        return datetime.strptime(date_str, "%m/%d/%Y").date()
    except ValueError:
        pass
    return None

router = APIRouter()


class ScrapeRequest(BaseModel):
    """Request to scrape a wedding website."""
    url: str


class ScrapeResponse(BaseModel):
    """Response with scraped wedding data preview."""
    success: bool
    platform: Optional[str] = None
    data: dict
    preview: dict
    message: str


class ImportRequest(BaseModel):
    """Request to import scraped data into a wedding."""
    url: str
    data: Optional[dict] = None  # Pre-scraped structured data to avoid re-scraping


class ImportResponse(BaseModel):
    """Response after importing wedding data."""
    success: bool
    wedding_id: str
    access_code: str
    chat_url: str
    message: str


@router.post("/", response_model=ScrapeResponse)
async def scrape_wedding_website(request: ScrapeRequest):
    """
    Scrape a wedding website and return extracted data preview.

    Supports: The Knot, Zola, WithJoy, WeddingWire, Minted, and generic sites.
    """
    # Validate URL to prevent SSRF
    is_valid, error_msg = validate_url_for_ssrf(request.url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    scraper = WeddingScraper()

    try:
        # Scrape the website
        raw_data = await scraper.scrape(request.url)

        if "error" in raw_data:
            raise HTTPException(
                status_code=400,
                detail=raw_data["error"]
            )

        # Map to structured wedding data
        mapper = WeddingDataMapper()
        structured_data = await mapper.extract_structured_data(raw_data)

        # Get lists for preview and transform to frontend format
        raw_events = structured_data.get("events", [])
        # Transform event field names from Claude format to frontend format
        events = [
            {
                "name": e.get("event_name", ""),
                "date": e.get("event_date"),
                "time": e.get("event_time"),
                "description": e.get("description"),
                "venue_name": e.get("venue_name"),
                "venue_address": e.get("venue_address"),
                "dress_code": e.get("dress_code"),
            }
            for e in raw_events
        ]
        raw_accommodations = structured_data.get("accommodations", [])
        # Transform accommodation field names from Claude format to frontend format
        accommodations = [
            {
                "name": a.get("hotel_name", ""),
                "address": a.get("address"),
                "phone": a.get("phone"),
                "booking_url": a.get("booking_url"),
                "room_block_name": a.get("room_block_name"),
                "room_block_code": a.get("room_block_code"),
            }
            for a in raw_accommodations
        ]
        faqs = structured_data.get("faqs", [])

        # Create preview for user confirmation
        preview = {
            "partner1_name": structured_data.get("partner1_name", ""),
            "partner2_name": structured_data.get("partner2_name", ""),
            "wedding_date": structured_data.get("wedding_date"),
            "ceremony_venue": structured_data.get("ceremony_venue_name"),
            "ceremony_venue_address": structured_data.get("ceremony_venue_address"),
            "reception_venue": structured_data.get("reception_venue_name"),
            "reception_venue_address": structured_data.get("reception_venue_address"),
            "dress_code": structured_data.get("dress_code"),
            "events_count": len(events),
            "accommodations_count": len(accommodations),
            "faqs_count": len(faqs),
            "has_registry": bool(structured_data.get("registry_urls")),
            "events": events,
            "accommodations": accommodations,
            "faqs": faqs,
        }

        return ScrapeResponse(
            success=True,
            platform=raw_data.get("platform", "generic"),
            data=structured_data,
            preview=preview,
            message=f"Successfully extracted wedding data from {raw_data.get('platform', 'website')}"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scrape website: {str(e)}"
        )
    finally:
        await scraper.close()


@router.post("/import", response_model=ImportResponse)
async def import_wedding_from_url(
    request: ImportRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Scrape a wedding website and create a new wedding from the data.

    If authenticated, links the wedding to the user's account.
    """
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from core.database import async_session_maker
    from core.auth import decode_token
    from models.wedding import Wedding, WeddingEvent, WeddingAccommodation, WeddingFAQ
    from models.user import User

    # Check if user is authenticated
    user_id = None
    if credentials:
        payload = decode_token(credentials.credentials)
        if payload:
            user_id = payload.get("sub")

    scraper = None
    raw_data = None

    try:
        # Use pre-scraped data if provided, otherwise scrape
        if request.data:
            structured_data = request.data
            raw_data = {}  # No raw data when using pre-scraped
        else:
            # Validate URL to prevent SSRF
            is_valid, error_msg = validate_url_for_ssrf(request.url)
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)

            # Fallback: scrape the website (slower path)
            scraper = WeddingScraper()
            raw_data = await scraper.scrape(request.url)

            if "error" in raw_data:
                raise HTTPException(
                    status_code=400,
                    detail=raw_data["error"]
                )

            # Map to structured wedding data
            mapper = WeddingDataMapper()
            structured_data = await mapper.extract_structured_data(raw_data)

        # Validate we have minimum required data
        partner1 = structured_data.get("partner1_name", "").strip()
        partner2 = structured_data.get("partner2_name", "").strip()

        if not partner1 or not partner2:
            raise HTTPException(
                status_code=400,
                detail="Could not extract partner names from the website. Please try a different URL or enter details manually."
            )

        # Generate access code
        name1 = partner1.lower().split()[0] if partner1 else "partner1"
        name2 = partner2.lower().split()[0] if partner2 else "partner2"
        access_code = f"{name1}-{name2}"

        # Create wedding in database
        async with async_session_maker() as db:
            # Check if access code exists, append number if needed
            from sqlalchemy import select
            result = await db.execute(
                select(Wedding).where(Wedding.access_code.like(f"{access_code}%"))
            )
            existing = result.scalars().all()
            if existing:
                access_code = f"{access_code}-{len(existing) + 1}"

            # Create wedding
            wedding = Wedding(
                partner1_name=partner1,
                partner2_name=partner2,
                couple_email=f"{access_code}@placeholder.wedding",  # Placeholder until claimed
                wedding_date=parse_date(structured_data.get("wedding_date")),
                wedding_time=structured_data.get("wedding_time"),
                dress_code=structured_data.get("dress_code"),
                ceremony_venue_name=structured_data.get("ceremony_venue_name"),
                ceremony_venue_address=structured_data.get("ceremony_venue_address"),
                reception_venue_name=structured_data.get("reception_venue_name"),
                reception_venue_address=structured_data.get("reception_venue_address"),
                reception_time=structured_data.get("reception_time"),
                registry_urls=structured_data.get("registry_urls"),
                wedding_website_url=request.url,
                rsvp_url=structured_data.get("rsvp_url"),
                additional_notes=structured_data.get("additional_notes"),
                scraped_data=raw_data,
                access_code=access_code
            )
            db.add(wedding)
            await db.flush()

            # If user is authenticated, link wedding to their account
            if user_id:
                user_result = await db.execute(select(User).where(User.id == user_id))
                user = user_result.scalar_one_or_none()
                if user:
                    user.wedding_id = wedding.id

            # Add events
            for event_data in structured_data.get("events", []):
                event = WeddingEvent(
                    wedding_id=wedding.id,
                    event_name=event_data.get("event_name", "Event"),
                    event_date=parse_date(event_data.get("event_date")),
                    event_time=event_data.get("event_time"),
                    venue_name=event_data.get("venue_name"),
                    venue_address=event_data.get("venue_address"),
                    description=event_data.get("description"),
                    dress_code=event_data.get("dress_code")
                )
                db.add(event)

            # Add accommodations
            for acc_data in structured_data.get("accommodations", []):
                accommodation = WeddingAccommodation(
                    wedding_id=wedding.id,
                    hotel_name=acc_data.get("hotel_name", "Hotel"),
                    address=acc_data.get("address"),
                    phone=acc_data.get("phone"),
                    booking_url=acc_data.get("booking_url"),
                    has_room_block=acc_data.get("has_room_block", False),
                    room_block_name=acc_data.get("room_block_name"),
                    room_block_code=acc_data.get("room_block_code"),
                    room_block_rate=acc_data.get("room_block_rate"),
                    distance_to_venue=acc_data.get("distance_to_venue"),
                    notes=acc_data.get("notes")
                )
                db.add(accommodation)

            # Add FAQs
            for faq_data in structured_data.get("faqs", []):
                faq = WeddingFAQ(
                    wedding_id=wedding.id,
                    question=faq_data.get("question", ""),
                    answer=faq_data.get("answer", ""),
                    category=faq_data.get("category")
                )
                db.add(faq)

            await db.commit()

            return ImportResponse(
                success=True,
                wedding_id=str(wedding.id),
                access_code=wedding.access_code,
                chat_url=f"/chat/{wedding.access_code}",
                message=f"Wedding imported successfully! Share your chat link with guests."
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to import wedding: {str(e)}"
        )
    finally:
        if scraper:
            await scraper.close()


# ============================================================================
# Background Job Endpoints - for mobile-friendly async scraping
# ============================================================================

class StartScrapeRequest(BaseModel):
    """Request to start a background scrape job."""
    url: str


class StartScrapeResponse(BaseModel):
    """Response with job ID for polling."""
    job_id: str
    message: str


class JobStatusResponse(BaseModel):
    """Response with job status and results if complete."""
    job_id: str
    status: str
    progress: int
    message: Optional[str] = None
    # Results (only present when completed)
    platform: Optional[str] = None
    data: Optional[dict] = None
    preview: Optional[dict] = None
    # Error (only present when failed)
    error: Optional[str] = None


async def run_scrape_job(job_id: str, url: str):
    """Background task to run the scrape job."""
    async with async_session_maker() as db:
        from sqlalchemy import select

        # Get the job
        result = await db.execute(select(ScrapeJob).where(ScrapeJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        # Update status to processing
        job.status = ScrapeJobStatus.PROCESSING
        job.started_at = datetime.utcnow()
        job.progress = 10
        job.message = "Connecting to website..."
        await db.commit()

        scraper = WeddingScraper()

        try:
            # Update progress
            job.progress = 25
            job.message = "Loading main page..."
            await db.commit()

            # Scrape the website
            raw_data = await scraper.scrape(url)

            if "error" in raw_data:
                job.status = ScrapeJobStatus.FAILED
                job.error = raw_data["error"]
                job.completed_at = datetime.utcnow()
                await db.commit()
                return

            # Update progress
            job.progress = 70
            job.message = "Extracting wedding details..."
            await db.commit()

            # Map to structured wedding data
            mapper = WeddingDataMapper()
            structured_data = await mapper.extract_structured_data(raw_data)

            # Transform for frontend
            raw_events = structured_data.get("events", [])
            events = [
                {
                    "name": e.get("event_name", ""),
                    "date": e.get("event_date"),
                    "time": e.get("event_time"),
                    "description": e.get("description"),
                    "venue_name": e.get("venue_name"),
                    "venue_address": e.get("venue_address"),
                    "dress_code": e.get("dress_code"),
                }
                for e in raw_events
            ]
            raw_accommodations = structured_data.get("accommodations", [])
            accommodations = [
                {
                    "name": a.get("hotel_name", ""),
                    "address": a.get("address"),
                    "phone": a.get("phone"),
                    "booking_url": a.get("booking_url"),
                    "room_block_name": a.get("room_block_name"),
                    "room_block_code": a.get("room_block_code"),
                }
                for a in raw_accommodations
            ]
            faqs = structured_data.get("faqs", [])

            # Create preview
            preview = {
                "partner1_name": structured_data.get("partner1_name", ""),
                "partner2_name": structured_data.get("partner2_name", ""),
                "wedding_date": structured_data.get("wedding_date"),
                "ceremony_venue": structured_data.get("ceremony_venue_name"),
                "ceremony_venue_address": structured_data.get("ceremony_venue_address"),
                "reception_venue": structured_data.get("reception_venue_name"),
                "reception_venue_address": structured_data.get("reception_venue_address"),
                "dress_code": structured_data.get("dress_code"),
                "events_count": len(events),
                "accommodations_count": len(accommodations),
                "faqs_count": len(faqs),
                "has_registry": bool(structured_data.get("registry_urls")),
                "events": events,
                "accommodations": accommodations,
                "faqs": faqs,
            }

            # Update job with results
            job.status = ScrapeJobStatus.COMPLETED
            job.progress = 100
            job.message = "Complete!"
            job.platform = raw_data.get("platform", "generic")
            job.scraped_data = structured_data
            job.preview_data = preview
            job.completed_at = datetime.utcnow()
            await db.commit()

            logger.info(f"Job {job_id} completed successfully")

        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}")
            job.status = ScrapeJobStatus.FAILED
            job.error = str(e)
            job.completed_at = datetime.utcnow()
            await db.commit()
        finally:
            await scraper.close()


@router.post("/start", response_model=StartScrapeResponse)
async def start_scrape_job(request: StartScrapeRequest):
    """
    Start a background scrape job and return immediately with a job ID.

    The client can poll /status/{job_id} to check progress and get results.
    This is mobile-friendly - the scrape continues even if the user leaves the page.
    """
    # Validate URL to prevent SSRF
    is_valid, error_msg = validate_url_for_ssrf(request.url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Create job in database
    async with async_session_maker() as db:
        job = ScrapeJob(
            url=request.url,
            status=ScrapeJobStatus.PENDING,
            progress=0,
            message="Starting..."
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        job_id = job.id

    # Start background task
    asyncio.create_task(run_scrape_job(job_id, request.url))

    return StartScrapeResponse(
        job_id=job_id,
        message="Scrape job started. Poll /status/{job_id} for progress."
    )


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_scrape_job_status(job_id: str):
    """
    Get the status of a background scrape job.

    Returns progress updates while running, and full results when complete.
    """
    from sqlalchemy import select

    async with async_session_maker() as db:
        result = await db.execute(select(ScrapeJob).where(ScrapeJob.id == job_id))
        job = result.scalar_one_or_none()

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        response = JobStatusResponse(
            job_id=job.id,
            status=job.status.value,
            progress=job.progress,
            message=job.message
        )

        if job.status == ScrapeJobStatus.COMPLETED:
            response.platform = job.platform
            response.data = job.scraped_data
            response.preview = job.preview_data
        elif job.status == ScrapeJobStatus.FAILED:
            response.error = job.error

        return response
