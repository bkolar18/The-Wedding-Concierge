"""Weekly digest email API endpoints."""
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.database import get_db
from core.auth import get_current_user
from models.user import User
from models.wedding import Wedding
from models.chat import ChatSession, ChatMessage
from services.email import email_service
from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_weekly_stats(
    wedding_id: str,
    db: AsyncSession
) -> dict:
    """
    Get chat statistics for the past week.

    Returns:
        Dict with total_conversations, total_messages, unique_guests, top_topics
    """
    week_ago = datetime.utcnow() - timedelta(days=7)

    # Get conversations this week
    sessions_result = await db.execute(
        select(ChatSession)
        .where(
            ChatSession.wedding_id == wedding_id,
            ChatSession.created_at >= week_ago
        )
    )
    sessions = sessions_result.scalars().all()
    session_ids = [s.id for s in sessions]

    total_conversations = len(sessions)
    unique_guests = len(set(s.guest_name for s in sessions if s.guest_name))

    # Get messages this week
    if session_ids:
        messages_result = await db.execute(
            select(func.count(ChatMessage.id))
            .where(
                ChatMessage.session_id.in_(session_ids),
                ChatMessage.role == "user"
            )
        )
        total_messages = messages_result.scalar() or 0
    else:
        total_messages = 0

    # Note: Topic extraction could be added in a future version
    # by analyzing message content with AI

    return {
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "unique_guests": unique_guests,
        "top_topics": []  # Reserved for future topic extraction feature
    }


@router.post("/send-my-digest")
async def send_my_weekly_digest(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send weekly digest email to the current user.

    This can be triggered manually by the user to preview their digest,
    or called by a scheduled job.
    """
    if not current_user.wedding_id:
        raise HTTPException(
            status_code=404,
            detail="You don't have a wedding yet."
        )

    # Get wedding
    result = await db.execute(
        select(Wedding).where(Wedding.id == current_user.wedding_id)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found")

    # Get stats
    stats = await get_weekly_stats(wedding.id, db)

    # Generate email
    week_end = datetime.utcnow()
    week_start = week_end - timedelta(days=7)
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"

    html_content = email_service.generate_weekly_digest_html(
        partner1_name=wedding.partner1_name,
        partner2_name=wedding.partner2_name,
        total_conversations=stats["total_conversations"],
        total_messages=stats["total_messages"],
        unique_guests=stats["unique_guests"],
        top_topics=stats["top_topics"],
        week_start=week_start,
        week_end=week_end,
        dashboard_url=dashboard_url
    )

    # Send email
    result = await email_service.send_email(
        to_email=current_user.email,
        subject=f"Your Wedding Concierge Weekly Update - {wedding.partner1_name} & {wedding.partner2_name}",
        html_content=html_content
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {result.get('error', 'Unknown error')}"
        )

    return {
        "success": True,
        "message": f"Weekly digest sent to {current_user.email}",
        "stats": stats
    }


@router.get("/preview")
async def preview_weekly_digest(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a preview of the weekly digest without sending an email.

    Returns the stats that would be included in the email.
    """
    if not current_user.wedding_id:
        raise HTTPException(
            status_code=404,
            detail="You don't have a wedding yet."
        )

    # Get wedding
    result = await db.execute(
        select(Wedding).where(Wedding.id == current_user.wedding_id)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found")

    # Get stats
    stats = await get_weekly_stats(wedding.id, db)

    return {
        "wedding": {
            "partner1_name": wedding.partner1_name,
            "partner2_name": wedding.partner2_name
        },
        "period": {
            "start": (datetime.utcnow() - timedelta(days=7)).isoformat(),
            "end": datetime.utcnow().isoformat()
        },
        "stats": stats
    }
