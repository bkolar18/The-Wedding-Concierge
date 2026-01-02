"""Contact form API route."""
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from services.email import email_service

router = APIRouter()


class ContactRequest(BaseModel):
    """Contact form submission."""
    name: str
    email: EmailStr
    message: str
    wedding_date: Optional[str] = None


@router.post("/contact")
async def submit_contact_form(request: ContactRequest):
    """
    Submit a contact form inquiry.

    Sends an email notification with the inquiry details.
    """
    success = await email_service.send_contact_notification(
        name=request.name,
        email=request.email,
        message=request.message,
        wedding_date=request.wedding_date
    )

    if not success and email_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message. Please try again."
        )

    return {"message": "Thank you for your message! We'll get back to you soon."}
