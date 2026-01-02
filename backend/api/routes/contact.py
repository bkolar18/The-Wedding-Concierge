"""Contact form API route."""
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from services.email import email_service
from core.config import settings

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
    # Build email content
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(to right, #f43f5e, #e11d48); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }}
        .field {{ margin-bottom: 16px; }}
        .label {{ font-weight: 600; color: #374151; }}
        .value {{ background: white; padding: 12px; border-radius: 6px; margin-top: 4px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">New Contact Form Submission</h2>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">Name</div>
                <div class="value">{request.name}</div>
            </div>
            <div class="field">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:{request.email}">{request.email}</a></div>
            </div>
            {f'<div class="field"><div class="label">Wedding Date</div><div class="value">{request.wedding_date}</div></div>' if request.wedding_date else ''}
            <div class="field">
                <div class="label">Message</div>
                <div class="value">{request.message}</div>
            </div>
        </div>
    </div>
</body>
</html>
"""

    text_content = f"""
New Contact Form Submission

Name: {request.name}
Email: {request.email}
{f'Wedding Date: {request.wedding_date}' if request.wedding_date else ''}
Message:
{request.message}
"""

    # Send to admin email (or configured support email)
    admin_email = settings.SMTP_USER or "support@weddingconcierge.app"

    success = await email_service.send_email(
        to_email=admin_email,
        subject=f"Contact Form: {request.name}",
        html_content=html_content,
        text_content=text_content
    )

    if not success and email_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message. Please try again."
        )

    return {"message": "Thank you for your message! We'll get back to you soon."}
