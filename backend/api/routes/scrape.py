"""Wedding website scraping API endpoints."""
from typing import Optional
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, HttpUrl

from services.scraper import WeddingScraper
from services.scraper.data_mapper import WeddingDataMapper
from core.auth import get_current_user_optional

# Optional auth - doesn't require login but accepts token if provided
security = HTTPBearer(auto_error=False)


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

        # Create preview for user confirmation
        preview = {
            "partner1_name": structured_data.get("partner1_name", ""),
            "partner2_name": structured_data.get("partner2_name", ""),
            "wedding_date": structured_data.get("wedding_date"),
            "ceremony_venue": structured_data.get("ceremony_venue_name"),
            "reception_venue": structured_data.get("reception_venue_name"),
            "dress_code": structured_data.get("dress_code"),
            "events_count": len(structured_data.get("events", [])),
            "accommodations_count": len(structured_data.get("accommodations", [])),
            "has_registry": bool(structured_data.get("registry_urls")),
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
        await scraper.close()
