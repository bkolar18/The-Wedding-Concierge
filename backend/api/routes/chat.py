"""Chat API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.database import get_db
from models.wedding import Wedding
from models.chat import ChatSession, ChatMessage
from services.chat import ChatEngine

router = APIRouter()

# Create chat engine lazily to ensure settings are loaded
_chat_engine = None

def get_chat_engine():
    global _chat_engine
    if _chat_engine is None:
        _chat_engine = ChatEngine()
    return _chat_engine


class ChatRequest(BaseModel):
    """Request to send a chat message."""
    message: str
    session_id: Optional[str] = None
    guest_name: Optional[str] = None


class ChatResponse(BaseModel):
    """Response from the chat."""
    response: str
    session_id: str


class StartChatRequest(BaseModel):
    """Request to start a new chat session."""
    access_code: str
    guest_name: Optional[str] = None


class StartChatResponse(BaseModel):
    """Response when starting a new chat."""
    session_id: str
    greeting: str
    wedding_title: str


class WeddingPreviewResponse(BaseModel):
    """Wedding preview info for guests before starting chat."""
    partner1_name: str
    partner2_name: str
    wedding_date: Optional[str] = None
    ceremony_venue_name: Optional[str] = None
    ceremony_venue_address: Optional[str] = None
    dress_code: Optional[str] = None
    access_code: str
    wedding_website_url: Optional[str] = None
    chat_greeting: Optional[str] = None
    show_branding: bool = True


@router.get("/preview/{access_code}", response_model=WeddingPreviewResponse)
async def get_wedding_preview(
    access_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get wedding preview info by access code.

    Used to display wedding details on the chat page before starting a session.
    """
    result = await db.execute(
        select(Wedding).where(
            Wedding.access_code == access_code,
            Wedding.is_active == True
        )
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(
            status_code=404,
            detail="Wedding not found. Please check your access code."
        )

    return WeddingPreviewResponse(
        partner1_name=wedding.partner1_name,
        partner2_name=wedding.partner2_name,
        wedding_date=wedding.wedding_date.isoformat() if wedding.wedding_date else None,
        ceremony_venue_name=wedding.ceremony_venue_name,
        ceremony_venue_address=wedding.ceremony_venue_address,
        dress_code=wedding.dress_code,
        access_code=wedding.access_code,
        wedding_website_url=wedding.wedding_website_url,
        chat_greeting=wedding.chat_greeting,
        show_branding=wedding.show_branding if wedding.show_branding is not None else True
    )


@router.post("/start", response_model=StartChatResponse)
async def start_chat(
    request: StartChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Start a new chat session with a wedding.

    Guests use the wedding's access code to connect.
    """
    # Find wedding by access code
    result = await db.execute(
        select(Wedding).where(
            Wedding.access_code == request.access_code,
            Wedding.is_active == True
        )
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(
            status_code=404,
            detail="Wedding not found. Please check your access code."
        )

    # Create a new chat session
    session = ChatSession(
        wedding_id=wedding.id,
        guest_identifier=f"web-{request.guest_name or 'guest'}",
        guest_name=request.guest_name,
        channel="web"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Get greeting
    greeting = await get_chat_engine().get_greeting(wedding)

    # Save greeting as first message
    greeting_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=greeting
    )
    db.add(greeting_msg)
    await db.commit()

    return StartChatResponse(
        session_id=session.id,
        greeting=greeting,
        wedding_title=f"{wedding.partner1_name} & {wedding.partner2_name}'s Wedding"
    )


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send a message in an existing chat session."""
    if not request.session_id:
        raise HTTPException(
            status_code=400,
            detail="session_id is required"
        )

    # Get chat session with wedding
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == request.session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Chat session not found"
        )

    # Get wedding with all related data (including vendors for chat context)
    result = await db.execute(
        select(Wedding)
        .options(
            selectinload(Wedding.accommodations),
            selectinload(Wedding.events),
            selectinload(Wedding.faqs),
            selectinload(Wedding.vendors)
        )
        .where(Wedding.id == session.wedding_id)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(
            status_code=404,
            detail="Wedding not found"
        )

    # Build wedding_data dict - extract relationships while they're loaded
    accommodations_list = list(wedding.accommodations)
    events_list = list(wedding.events)
    faqs_list = list(wedding.faqs)
    vendors_list = list(wedding.vendors) if wedding.vendors else []

    wedding_data = {
        "partner1_name": wedding.partner1_name,
        "partner2_name": wedding.partner2_name,
        "wedding_date": wedding.wedding_date,
        "wedding_time": wedding.wedding_time,
        "dress_code": wedding.dress_code,
        "ceremony_venue_name": wedding.ceremony_venue_name,
        "ceremony_venue_address": wedding.ceremony_venue_address,
        "ceremony_venue_url": wedding.ceremony_venue_url,
        "reception_venue_name": wedding.reception_venue_name,
        "reception_venue_address": wedding.reception_venue_address,
        "reception_venue_url": wedding.reception_venue_url,
        "reception_time": wedding.reception_time,
        "registry_urls": wedding.registry_urls,
        "wedding_website_url": wedding.wedding_website_url,
        "rsvp_url": wedding.rsvp_url,
        "rsvp_deadline": wedding.rsvp_deadline,
        "additional_notes": wedding.additional_notes,
        "accommodations": [
            {
                "hotel_name": acc.hotel_name,
                "address": acc.address,
                "phone": acc.phone,
                "distance_to_venue": acc.distance_to_venue,
                "has_room_block": acc.has_room_block,
                "room_block_name": acc.room_block_name,
                "room_block_code": acc.room_block_code,
                "room_block_rate": acc.room_block_rate,
                "room_block_deadline": acc.room_block_deadline,
                "booking_url": acc.booking_url,
                "notes": acc.notes,
            }
            for acc in accommodations_list
        ],
        "events": [
            {
                "event_name": event.event_name,
                "event_date": event.event_date,
                "event_time": event.event_time,
                "venue_name": event.venue_name,
                "venue_address": event.venue_address,
                "dress_code": event.dress_code,
                "description": event.description,
            }
            for event in events_list
        ],
        "faqs": [
            {
                "question": faq.question,
                "answer": faq.answer,
            }
            for faq in faqs_list
        ],
        "vendors": [
            {
                "business_name": vendor.business_name,
                "category": vendor.category,
                "contact_name": vendor.contact_name,
                "email": vendor.email,
                "phone": vendor.phone,
                "website_url": vendor.website_url,
                "instagram_handle": vendor.instagram_handle,
                "service_description": vendor.service_description,
            }
            for vendor in vendors_list
            if vendor.is_confirmed  # Only include confirmed vendors in chat
        ],
    }

    # RAG: Extract full scraped text for comprehensive Q&A
    # This allows Claude to answer ANY question from the wedding website
    full_text = None
    if wedding.scraped_data and isinstance(wedding.scraped_data, dict):
        full_text = wedding.scraped_data.get("full_text", "")
        # Cap at 25KB to stay within token limits while leaving room for
        # system prompt, structured data, conversation history, and response
        if full_text and len(full_text) > 25000:
            full_text = full_text[:25000] + "\n\n[Content truncated for length...]"
    wedding_data["full_text"] = full_text

    # Get conversation history
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()

    # Build conversation history for LLM
    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in messages
    ]

    # Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=request.message
    )
    db.add(user_msg)

    # Get AI response (with caching for common questions)
    response = await get_chat_engine().chat(
        wedding_data=wedding_data,
        message=request.message,
        conversation_history=conversation_history,
        wedding_id=str(wedding.id)
    )

    # Save assistant response
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=response
    )
    db.add(assistant_msg)
    await db.commit()

    return ChatResponse(
        response=response,
        session_id=session.id
    )


@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get the chat history for a session."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()

    return {
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.created_at.isoformat()
            }
            for msg in messages
        ]
    }
