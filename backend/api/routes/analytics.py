"""Analytics API endpoints for wedding dashboard."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.auth import get_current_user
from models.wedding import Wedding
from models.chat import ChatSession, ChatMessage
from models.user import User
from models.sms import Guest

router = APIRouter()

# Topic keywords for categorizing questions (privacy-friendly)
TOPIC_KEYWORDS = {
    "Dress Code": ["dress code", "attire", "wear", "outfit", "formal", "casual", "black tie", "cocktail"],
    "Venue & Directions": ["venue", "location", "address", "directions", "parking", "where is", "get there"],
    "Schedule & Timing": ["time", "start", "begin", "schedule", "when", "what time", "ceremony time"],
    "Accommodations": ["hotel", "stay", "accommodation", "room", "book", "lodging", "where to stay"],
    "Food & Drinks": ["food", "dinner", "meal", "menu", "dietary", "vegetarian", "vegan", "allergies", "drinks", "bar", "alcohol"],
    "RSVP & Plus Ones": ["rsvp", "plus one", "guest", "bring someone", "respond"],
    "Registry & Gifts": ["gift", "registry", "present", "what to get"],
    "Transportation": ["transportation", "shuttle", "uber", "taxi", "ride", "parking"],
    "Photos & Social": ["photo", "hashtag", "instagram", "social media", "pictures"],
    "Wedding Party": ["bridesmaid", "groomsmen", "wedding party", "best man", "maid of honor"],
    "General Info": [],  # Fallback category
}


def extract_topics(messages: List[str]) -> List[str]:
    """Extract topic categories from user messages (privacy-friendly)."""
    topics = set()
    combined_text = " ".join(messages).lower()

    for topic, keywords in TOPIC_KEYWORDS.items():
        if topic == "General Info":
            continue
        for keyword in keywords:
            if keyword in combined_text:
                topics.add(topic)
                break

    # If no specific topics found, mark as General Info
    if not topics:
        topics.add("General Info")

    return sorted(list(topics))


class ChatSessionSummary(BaseModel):
    """Summary of a single chat session (privacy-friendly - no full messages)."""
    id: str
    guest_name: Optional[str]
    channel: str
    message_count: int
    topics: List[str]  # Topics discussed, not full messages
    created_at: datetime
    last_message_at: datetime


class AnalyticsResponse(BaseModel):
    """Analytics data for a wedding."""
    total_sessions: int
    total_messages: int
    unique_guests: int
    web_sessions: int
    sms_sessions: int
    topic_breakdown: dict  # Count of questions by topic
    recent_sessions: List[ChatSessionSummary]
    # Guest engagement stats
    guests_who_used_chat: int = 0
    total_guests: int = 0


@router.get("", response_model=AnalyticsResponse)
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get analytics for the current user's wedding.

    Returns chat statistics and recent sessions.
    """
    # Get user's wedding (User has wedding_id, not Wedding has owner_id)
    if not current_user.wedding_id:
        raise HTTPException(status_code=404, detail="No wedding found")

    result = await db.execute(
        select(Wedding).where(Wedding.id == current_user.wedding_id)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(status_code=404, detail="No wedding found")

    # Initialize counters
    total_sessions = 0
    total_messages = 0
    unique_guests = 0
    web_sessions = 0
    sms_sessions = 0
    topic_breakdown = {}
    recent_sessions = []
    guests_who_used_chat = 0
    total_guests = 0

    try:
        # Get total sessions count
        sessions_result = await db.execute(
            select(func.count(ChatSession.id))
            .where(ChatSession.wedding_id == wedding.id)
        )
        total_sessions = sessions_result.scalar() or 0

        # Get total messages count
        messages_result = await db.execute(
            select(func.count(ChatMessage.id))
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .where(ChatSession.wedding_id == wedding.id)
        )
        total_messages = messages_result.scalar() or 0

        # Get unique guests count (by guest_identifier)
        unique_result = await db.execute(
            select(func.count(func.distinct(ChatSession.guest_identifier)))
            .where(ChatSession.wedding_id == wedding.id)
        )
        unique_guests = unique_result.scalar() or 0

        # Get web sessions count
        web_result = await db.execute(
            select(func.count(ChatSession.id))
            .where(
                ChatSession.wedding_id == wedding.id,
                ChatSession.channel == "web"
            )
        )
        web_sessions = web_result.scalar() or 0

        # Get SMS sessions count
        sms_result = await db.execute(
            select(func.count(ChatSession.id))
            .where(
                ChatSession.wedding_id == wedding.id,
                ChatSession.channel == "sms"
            )
        )
        sms_sessions = sms_result.scalar() or 0

        # Get recent sessions with messages for topic extraction
        sessions_query = await db.execute(
            select(ChatSession)
            .options(selectinload(ChatSession.messages))
            .where(ChatSession.wedding_id == wedding.id)
            .order_by(desc(ChatSession.last_message_at))
            .limit(20)
        )
        sessions = list(sessions_query.scalars().all())

        for session in sessions:
            # Extract user messages only (not assistant responses)
            user_messages = [
                msg.content for msg in session.messages
                if msg.role == "user"
            ]

            # Extract topics from user messages
            topics = extract_topics(user_messages)

            # Update topic breakdown counts
            for topic in topics:
                topic_breakdown[topic] = topic_breakdown.get(topic, 0) + 1

            recent_sessions.append(ChatSessionSummary(
                id=session.id,
                guest_name=session.guest_name,
                channel=session.channel,
                message_count=len(session.messages),
                topics=topics,
                created_at=session.created_at,
                last_message_at=session.last_message_at
            ))

        # Get guest engagement stats
        total_guests_result = await db.execute(
            select(func.count(Guest.id))
            .where(Guest.wedding_id == wedding.id)
        )
        total_guests = total_guests_result.scalar() or 0

        guests_who_used_chat_result = await db.execute(
            select(func.count(Guest.id))
            .where(
                Guest.wedding_id == wedding.id,
                Guest.has_used_chat == True
            )
        )
        guests_who_used_chat = guests_who_used_chat_result.scalar() or 0

    except Exception:
        # If chat tables don't exist yet, just return zeros
        pass

    return AnalyticsResponse(
        total_sessions=total_sessions,
        total_messages=total_messages,
        unique_guests=unique_guests,
        web_sessions=web_sessions,
        sms_sessions=sms_sessions,
        topic_breakdown=topic_breakdown,
        recent_sessions=recent_sessions,
        guests_who_used_chat=guests_who_used_chat,
        total_guests=total_guests
    )


# Note: Full transcript endpoint removed for guest privacy.
# Couples now see topic summaries instead of full conversations.
