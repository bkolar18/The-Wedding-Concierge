"""Wedding management API endpoints."""
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.auth import get_current_user
from models.wedding import Wedding, WeddingEvent, WeddingAccommodation, WeddingFAQ
from models.user import User

router = APIRouter()


# --- Pydantic Schemas ---

class AccommodationCreate(BaseModel):
    hotel_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website_url: Optional[str] = None
    booking_url: Optional[str] = None
    has_room_block: bool = False
    room_block_name: Optional[str] = None
    room_block_code: Optional[str] = None
    room_block_deadline: Optional[date] = None
    room_block_rate: Optional[str] = None
    distance_to_venue: Optional[str] = None
    notes: Optional[str] = None


class EventCreate(BaseModel):
    event_name: str
    event_date: Optional[date] = None
    event_time: Optional[str] = None
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    venue_url: Optional[str] = None
    description: Optional[str] = None
    dress_code: Optional[str] = None


class FAQCreate(BaseModel):
    question: str
    answer: str
    category: Optional[str] = None


class WeddingCreate(BaseModel):
    partner1_name: str
    partner2_name: str
    couple_email: Optional[str] = None
    wedding_date: Optional[date] = None
    wedding_time: Optional[str] = None
    dress_code: Optional[str] = None
    ceremony_venue_name: Optional[str] = None
    ceremony_venue_address: Optional[str] = None
    ceremony_venue_url: Optional[str] = None
    reception_venue_name: Optional[str] = None
    reception_venue_address: Optional[str] = None
    reception_venue_url: Optional[str] = None
    reception_time: Optional[str] = None
    registry_urls: Optional[dict] = None
    wedding_website_url: Optional[str] = None
    rsvp_url: Optional[str] = None
    additional_notes: Optional[str] = None
    access_code: Optional[str] = None


class WeddingUpdate(BaseModel):
    partner1_name: Optional[str] = None
    partner2_name: Optional[str] = None
    wedding_date: Optional[date] = None
    wedding_time: Optional[str] = None
    dress_code: Optional[str] = None
    ceremony_venue_name: Optional[str] = None
    ceremony_venue_address: Optional[str] = None
    ceremony_venue_url: Optional[str] = None
    reception_venue_name: Optional[str] = None
    reception_venue_address: Optional[str] = None
    reception_venue_url: Optional[str] = None
    reception_time: Optional[str] = None
    registry_urls: Optional[dict] = None
    wedding_website_url: Optional[str] = None
    rsvp_url: Optional[str] = None
    additional_notes: Optional[str] = None
    access_code: Optional[str] = None


# --- Endpoints ---

@router.post("/me", status_code=201)
async def create_my_wedding(
    wedding_data: WeddingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a wedding for the authenticated user.

    This links the wedding to the user's account.
    """
    # Check if user already has a wedding
    if current_user.wedding_id:
        raise HTTPException(
            status_code=400,
            detail="You already have a wedding. Use PATCH to update it."
        )

    # Use user's email for the wedding
    wedding_email = wedding_data.couple_email or current_user.email

    # Check if email already exists
    result = await db.execute(
        select(Wedding).where(Wedding.couple_email == wedding_email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="A wedding with this email already exists"
        )

    # Generate access code if not provided
    access_code = wedding_data.access_code
    if not access_code:
        name1 = wedding_data.partner1_name.lower().split()[0]
        name2 = wedding_data.partner2_name.lower().split()[0]
        if wedding_data.wedding_date:
            access_code = f"{name1}-{name2}-{wedding_data.wedding_date.year}"
        else:
            access_code = f"{name1}-{name2}"

    # Create wedding
    wedding = Wedding(
        partner1_name=wedding_data.partner1_name,
        partner2_name=wedding_data.partner2_name,
        couple_email=wedding_email,
        wedding_date=wedding_data.wedding_date,
        wedding_time=wedding_data.wedding_time,
        dress_code=wedding_data.dress_code,
        ceremony_venue_name=wedding_data.ceremony_venue_name,
        ceremony_venue_address=wedding_data.ceremony_venue_address,
        ceremony_venue_url=wedding_data.ceremony_venue_url,
        reception_venue_name=wedding_data.reception_venue_name,
        reception_venue_address=wedding_data.reception_venue_address,
        reception_venue_url=wedding_data.reception_venue_url,
        reception_time=wedding_data.reception_time,
        registry_urls=wedding_data.registry_urls,
        wedding_website_url=wedding_data.wedding_website_url,
        rsvp_url=wedding_data.rsvp_url,
        additional_notes=wedding_data.additional_notes,
        access_code=access_code
    )
    db.add(wedding)
    await db.flush()

    # Link wedding to user
    current_user.wedding_id = wedding.id
    await db.commit()
    await db.refresh(wedding)

    return {
        "id": str(wedding.id),
        "access_code": wedding.access_code,
        "chat_url": f"/chat/{wedding.access_code}",
        "message": f"Wedding created! Share this link with your guests."
    }


@router.get("/me")
async def get_my_wedding(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the authenticated user's wedding with all related data."""
    if not current_user.wedding_id:
        raise HTTPException(
            status_code=404,
            detail="You don't have a wedding yet. Create one first."
        )

    result = await db.execute(
        select(Wedding)
        .options(
            selectinload(Wedding.events),
            selectinload(Wedding.accommodations),
            selectinload(Wedding.faqs)
        )
        .where(Wedding.id == current_user.wedding_id)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found")

    return {
        "id": str(wedding.id),
        "partner1_name": wedding.partner1_name,
        "partner2_name": wedding.partner2_name,
        "couple_email": wedding.couple_email,
        "wedding_date": wedding.wedding_date.isoformat() if wedding.wedding_date else None,
        "wedding_time": wedding.wedding_time,
        "dress_code": wedding.dress_code,
        "ceremony": {
            "venue_name": wedding.ceremony_venue_name,
            "address": wedding.ceremony_venue_address,
            "url": wedding.ceremony_venue_url
        } if wedding.ceremony_venue_name else None,
        "reception": {
            "venue_name": wedding.reception_venue_name,
            "address": wedding.reception_venue_address,
            "url": wedding.reception_venue_url,
            "time": wedding.reception_time
        } if wedding.reception_venue_name else None,
        "registry_urls": wedding.registry_urls,
        "wedding_website_url": wedding.wedding_website_url,
        "rsvp_url": wedding.rsvp_url,
        "additional_notes": wedding.additional_notes,
        "access_code": wedding.access_code,
        "chat_url": f"/chat/{wedding.access_code}",
        "events": [
            {
                "id": str(e.id),
                "name": e.event_name,
                "date": e.event_date.isoformat() if e.event_date else None,
                "time": e.event_time,
                "venue_name": e.venue_name,
                "venue_address": e.venue_address,
                "description": e.description,
                "dress_code": e.dress_code
            }
            for e in wedding.events
        ],
        "accommodations": [
            {
                "id": str(a.id),
                "hotel_name": a.hotel_name,
                "address": a.address,
                "phone": a.phone,
                "booking_url": a.booking_url,
                "has_room_block": a.has_room_block,
                "room_block_name": a.room_block_name,
                "room_block_code": a.room_block_code,
                "room_block_rate": a.room_block_rate,
                "room_block_deadline": a.room_block_deadline.isoformat() if a.room_block_deadline else None,
                "distance_to_venue": a.distance_to_venue,
                "notes": a.notes
            }
            for a in wedding.accommodations
        ],
        "faqs": [
            {
                "id": str(f.id),
                "question": f.question,
                "answer": f.answer,
                "category": f.category
            }
            for f in wedding.faqs
        ]
    }


@router.patch("/me")
async def update_my_wedding(
    update_data: WeddingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update the authenticated user's wedding."""
    if not current_user.wedding_id:
        raise HTTPException(
            status_code=404,
            detail="You don't have a wedding yet. Create one first."
        )

    result = await db.execute(
        select(Wedding).where(Wedding.id == current_user.wedding_id)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found")

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(wedding, field, value)

    await db.commit()
    await db.refresh(wedding)

    return {"message": "Wedding updated successfully", "access_code": wedding.access_code}


@router.post("/", status_code=201)
async def create_wedding(
    wedding_data: WeddingCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new wedding."""
    # Check if email already exists
    result = await db.execute(
        select(Wedding).where(Wedding.couple_email == wedding_data.couple_email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="A wedding with this email already exists"
        )

    # Generate access code if not provided
    access_code = wedding_data.access_code
    if not access_code:
        # Create a simple access code from names
        name1 = wedding_data.partner1_name.lower().split()[0]
        name2 = wedding_data.partner2_name.lower().split()[0]
        if wedding_data.wedding_date:
            access_code = f"{name1}-{name2}-{wedding_data.wedding_date.year}"
        else:
            access_code = f"{name1}-{name2}"

    wedding = Wedding(
        **wedding_data.model_dump(exclude={"access_code"}),
        access_code=access_code
    )
    db.add(wedding)
    await db.commit()
    await db.refresh(wedding)

    return {
        "id": str(wedding.id),
        "access_code": wedding.access_code,
        "message": f"Wedding created! Share access code '{wedding.access_code}' with your guests."
    }


@router.get("/{wedding_id}")
async def get_wedding(
    wedding_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get wedding details with all related data."""
    result = await db.execute(
        select(Wedding)
        .options(
            selectinload(Wedding.events),
            selectinload(Wedding.accommodations),
            selectinload(Wedding.faqs)
        )
        .where(Wedding.id == wedding_id)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found")

    return {
        "id": str(wedding.id),
        "partner1_name": wedding.partner1_name,
        "partner2_name": wedding.partner2_name,
        "couple_email": wedding.couple_email,
        "wedding_date": wedding.wedding_date.isoformat() if wedding.wedding_date else None,
        "wedding_time": wedding.wedding_time,
        "dress_code": wedding.dress_code,
        "ceremony": {
            "venue_name": wedding.ceremony_venue_name,
            "address": wedding.ceremony_venue_address,
            "url": wedding.ceremony_venue_url
        } if wedding.ceremony_venue_name else None,
        "reception": {
            "venue_name": wedding.reception_venue_name,
            "address": wedding.reception_venue_address,
            "url": wedding.reception_venue_url,
            "time": wedding.reception_time
        } if wedding.reception_venue_name else None,
        "registry_urls": wedding.registry_urls,
        "wedding_website_url": wedding.wedding_website_url,
        "rsvp_url": wedding.rsvp_url,
        "additional_notes": wedding.additional_notes,
        "access_code": wedding.access_code,
        "events": [
            {
                "id": str(e.id),
                "name": e.event_name,
                "date": e.event_date.isoformat() if e.event_date else None,
                "time": e.event_time,
                "venue_name": e.venue_name,
                "venue_address": e.venue_address,
                "description": e.description,
                "dress_code": e.dress_code
            }
            for e in wedding.events
        ],
        "accommodations": [
            {
                "id": str(a.id),
                "hotel_name": a.hotel_name,
                "address": a.address,
                "phone": a.phone,
                "booking_url": a.booking_url,
                "has_room_block": a.has_room_block,
                "room_block_name": a.room_block_name,
                "room_block_code": a.room_block_code,
                "room_block_rate": a.room_block_rate,
                "room_block_deadline": a.room_block_deadline.isoformat() if a.room_block_deadline else None,
                "distance_to_venue": a.distance_to_venue,
                "notes": a.notes
            }
            for a in wedding.accommodations
        ],
        "faqs": [
            {
                "id": str(f.id),
                "question": f.question,
                "answer": f.answer,
                "category": f.category
            }
            for f in wedding.faqs
        ]
    }


@router.patch("/{wedding_id}")
async def update_wedding(
    wedding_id: str,
    update_data: WeddingUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update wedding details."""
    result = await db.execute(
        select(Wedding).where(Wedding.id == wedding_id)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found")

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(wedding, field, value)

    await db.commit()
    await db.refresh(wedding)

    return {"message": "Wedding updated successfully"}


# --- Accommodations ---

@router.post("/{wedding_id}/accommodations")
async def add_accommodation(
    wedding_id: str,
    accommodation: AccommodationCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add a hotel/accommodation to the wedding."""
    result = await db.execute(
        select(Wedding).where(Wedding.id == wedding_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Wedding not found")

    acc = WeddingAccommodation(
        wedding_id=wedding_id,
        **accommodation.model_dump()
    )
    db.add(acc)
    await db.commit()
    await db.refresh(acc)

    return {"id": str(acc.id), "message": "Accommodation added"}


@router.delete("/{wedding_id}/accommodations/{accommodation_id}")
async def delete_accommodation(
    wedding_id: str,
    accommodation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Remove an accommodation."""
    result = await db.execute(
        select(WeddingAccommodation).where(
            WeddingAccommodation.id == accommodation_id,
            WeddingAccommodation.wedding_id == wedding_id
        )
    )
    acc = result.scalar_one_or_none()

    if not acc:
        raise HTTPException(status_code=404, detail="Accommodation not found")

    await db.delete(acc)
    await db.commit()

    return {"message": "Accommodation deleted"}


# --- Events ---

@router.post("/{wedding_id}/events")
async def add_event(
    wedding_id: str,
    event: EventCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add an event to the wedding."""
    result = await db.execute(
        select(Wedding).where(Wedding.id == wedding_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Wedding not found")

    ev = WeddingEvent(
        wedding_id=wedding_id,
        **event.model_dump()
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)

    return {"id": str(ev.id), "message": "Event added"}


@router.delete("/{wedding_id}/events/{event_id}")
async def delete_event(
    wedding_id: str,
    event_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Remove an event."""
    result = await db.execute(
        select(WeddingEvent).where(
            WeddingEvent.id == event_id,
            WeddingEvent.wedding_id == wedding_id
        )
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    await db.delete(event)
    await db.commit()

    return {"message": "Event deleted"}


# --- FAQs ---

@router.post("/{wedding_id}/faqs")
async def add_faq(
    wedding_id: str,
    faq: FAQCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add a FAQ to the wedding."""
    result = await db.execute(
        select(Wedding).where(Wedding.id == wedding_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Wedding not found")

    f = WeddingFAQ(
        wedding_id=wedding_id,
        **faq.model_dump()
    )
    db.add(f)
    await db.commit()
    await db.refresh(f)

    return {"id": str(f.id), "message": "FAQ added"}


@router.delete("/{wedding_id}/faqs/{faq_id}")
async def delete_faq(
    wedding_id: str,
    faq_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Remove a FAQ."""
    result = await db.execute(
        select(WeddingFAQ).where(
            WeddingFAQ.id == faq_id,
            WeddingFAQ.wedding_id == wedding_id
        )
    )
    faq = result.scalar_one_or_none()

    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")

    await db.delete(faq)
    await db.commit()

    return {"message": "FAQ deleted"}
