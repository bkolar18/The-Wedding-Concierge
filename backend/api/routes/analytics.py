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

router = APIRouter()


class ChatSessionSummary(BaseModel):
    """Summary of a single chat session."""
    id: str
    guest_name: Optional[str]
    channel: str
    message_count: int
    created_at: datetime
    last_message_at: datetime


class AnalyticsResponse(BaseModel):
    """Analytics data for a wedding."""
    total_sessions: int
    total_messages: int
    unique_guests: int
    web_sessions: int
    sms_sessions: int
    recent_sessions: List[ChatSessionSummary]


class ChatTranscriptMessage(BaseModel):
    """A single message in a chat transcript."""
    role: str
    content: str
    timestamp: datetime


class ChatTranscriptResponse(BaseModel):
    """Full transcript of a chat session."""
    session_id: str
    guest_name: Optional[str]
    channel: str
    created_at: datetime
    messages: List[ChatTranscriptMessage]


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
    recent_sessions = []

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

        # Get recent sessions
        sessions_query = await db.execute(
            select(ChatSession)
            .where(ChatSession.wedding_id == wedding.id)
            .order_by(desc(ChatSession.last_message_at))
            .limit(20)
        )
        sessions = list(sessions_query.scalars().all())

        for session in sessions:
            # Get message count for each session
            msg_count_result = await db.execute(
                select(func.count(ChatMessage.id))
                .where(ChatMessage.session_id == session.id)
            )
            message_count = msg_count_result.scalar() or 0

            recent_sessions.append(ChatSessionSummary(
                id=session.id,
                guest_name=session.guest_name,
                channel=session.channel,
                message_count=message_count,
                created_at=session.created_at,
                last_message_at=session.last_message_at
            ))
    except Exception:
        # If chat tables don't exist yet, just return zeros
        pass

    return AnalyticsResponse(
        total_sessions=total_sessions,
        total_messages=total_messages,
        unique_guests=unique_guests,
        web_sessions=web_sessions,
        sms_sessions=sms_sessions,
        recent_sessions=recent_sessions
    )


@router.get("/transcript/{session_id}", response_model=ChatTranscriptResponse)
async def get_chat_transcript(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the full transcript of a chat session.

    Only accessible by the wedding owner.
    """
    # Get the session with messages
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Verify ownership
    wedding_result = await db.execute(
        select(Wedding).where(Wedding.id == session.wedding_id)
    )
    wedding = wedding_result.scalar_one_or_none()

    if not wedding or wedding.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this chat")

    # Build transcript
    messages = [
        ChatTranscriptMessage(
            role=msg.role,
            content=msg.content,
            timestamp=msg.created_at
        )
        for msg in sorted(session.messages, key=lambda m: m.created_at)
    ]

    return ChatTranscriptResponse(
        session_id=session.id,
        guest_name=session.guest_name,
        channel=session.channel,
        created_at=session.created_at,
        messages=messages
    )
