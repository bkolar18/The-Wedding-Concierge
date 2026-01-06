"""Public API endpoints (no authentication required)."""
import re
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from models.wedding import Wedding
from models.sms import Guest

router = APIRouter()


# --- Pydantic Schemas ---

class GuestRegistration(BaseModel):
    """Guest self-registration request."""
    name: str
    phone_number: str
    email: Optional[str] = None

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Normalize phone number to E.164 format."""
        # Remove all non-digit characters
        digits = re.sub(r'\D', '', v)

        # Handle US numbers
        if len(digits) == 10:
            return f"+1{digits}"
        elif len(digits) == 11 and digits.startswith('1'):
            return f"+{digits}"
        elif len(digits) > 10 and not v.startswith('+'):
            return f"+{digits}"
        elif v.startswith('+'):
            return f"+{digits}"
        else:
            raise ValueError('Invalid phone number format')

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Ensure name is not empty."""
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty')
        return v


class WeddingPublicInfo(BaseModel):
    """Public wedding info for the join page."""
    partner1_name: str
    partner2_name: str
    wedding_date: Optional[str] = None
    access_code: str


# --- Endpoints ---

@router.get("/wedding/{slug}")
async def get_wedding_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get public wedding info by slug.

    This is used by the guest registration page to display the wedding name.
    Only returns minimal public information.
    """
    result = await db.execute(
        select(Wedding).where(Wedding.slug == slug, Wedding.is_active == True)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(
            status_code=404,
            detail="Wedding not found. Please check the link and try again."
        )

    return WeddingPublicInfo(
        partner1_name=wedding.partner1_name,
        partner2_name=wedding.partner2_name,
        wedding_date=wedding.wedding_date.isoformat() if wedding.wedding_date else None,
        access_code=wedding.access_code
    )


@router.post("/wedding/{slug}/register")
async def register_guest(
    slug: str,
    registration: GuestRegistration,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a guest for a wedding.

    This creates a guest record and optionally sends an SMS with the chat link.
    Guests can use this to opt-in to receive wedding updates and get the chat link.
    """
    # Find the wedding by slug
    result = await db.execute(
        select(Wedding).where(Wedding.slug == slug, Wedding.is_active == True)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(
            status_code=404,
            detail="Wedding not found. Please check the link and try again."
        )

    # Check if guest with this phone number already exists for this wedding
    result = await db.execute(
        select(Guest).where(
            Guest.wedding_id == wedding.id,
            Guest.phone_number == registration.phone_number
        )
    )
    existing_guest = result.scalar_one_or_none()

    if existing_guest:
        # Guest already registered - just return success with chat link
        return {
            "success": True,
            "message": "You're already registered! Here's the chat link.",
            "chat_url": f"/chat/{wedding.access_code}",
            "guest_name": existing_guest.name,
            "already_registered": True
        }

    # Create new guest record
    guest = Guest(
        wedding_id=wedding.id,
        name=registration.name,
        phone_number=registration.phone_number,
        email=registration.email,
        sms_consent=True,  # They explicitly opted in by registering
        group_name="Self-registered"  # Tag for easy identification
    )
    db.add(guest)
    await db.commit()
    await db.refresh(guest)

    # TODO: Send SMS with chat link via Twilio
    # For now, just return the chat link in the response

    return {
        "success": True,
        "message": f"Welcome, {registration.name}! You're now registered.",
        "chat_url": f"/chat/{wedding.access_code}",
        "guest_id": str(guest.id),
        "already_registered": False
    }


@router.get("/wedding/by-access-code/{access_code}")
async def get_wedding_by_access_code(
    access_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get public wedding info by access code.

    Alternative lookup method for backwards compatibility.
    """
    result = await db.execute(
        select(Wedding).where(Wedding.access_code == access_code, Wedding.is_active == True)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(
            status_code=404,
            detail="Wedding not found. Please check the access code and try again."
        )

    return WeddingPublicInfo(
        partner1_name=wedding.partner1_name,
        partner2_name=wedding.partner2_name,
        wedding_date=wedding.wedding_date.isoformat() if wedding.wedding_date else None,
        access_code=wedding.access_code
    )
