"""Email service using Resend."""
from typing import Optional
import resend

from core.config import settings


class EmailService:
    """Service for sending emails via Resend."""

    def __init__(self):
        if settings.RESEND_API_KEY:
            resend.api_key = settings.RESEND_API_KEY

    @property
    def is_configured(self) -> bool:
        """Check if email service is configured."""
        return bool(settings.RESEND_API_KEY)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
    ) -> bool:
        """Send an email via Resend."""
        if not self.is_configured:
            print(f"[Email] Resend not configured. Would send to {to_email}: {subject}")
            return True  # Return True in dev mode so flow continues

        try:
            params = {
                "from": settings.EMAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }

            response = resend.Emails.send(params)
            print(f"[Email] Sent successfully to {to_email}, id: {response.get('id')}")
            return True

        except Exception as e:
            print(f"[Email] Failed to send to {to_email}: {e}")
            return False

    async def send_password_reset_email(self, to_email: str, reset_token: str, user_name: Optional[str] = None) -> bool:
        """Send password reset email with reset link."""
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        greeting = f"Hi {user_name}," if user_name else "Hi,"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ text-align: center; padding: 20px 0; }}
        .header h1 {{ color: #e11d48; margin: 0; font-size: 24px; }}
        .content {{ background: #fdf2f8; border-radius: 12px; padding: 30px; margin: 20px 0; }}
        .button {{ display: inline-block; background: linear-gradient(to right, #f43f5e, #e11d48); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }}
        .footer {{ text-align: center; color: #666; font-size: 14px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>The Wedding Concierge</h1>
        </div>
        <div class="content">
            <p>{greeting}</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" class="button">Reset Password</a>
            </p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
        </div>
        <div class="footer">
            <p>The Wedding Concierge - Your AI-powered wedding assistant</p>
        </div>
    </div>
</body>
</html>
"""

        return await self.send_email(
            to_email=to_email,
            subject="Reset Your Password - The Wedding Concierge",
            html_content=html_content,
        )

    async def send_contact_notification(self, name: str, email: str, message: str, wedding_date: Optional[str] = None) -> bool:
        """Send contact form notification to admin."""
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
                <div class="value">{name}</div>
            </div>
            <div class="field">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:{email}">{email}</a></div>
            </div>
            {f'<div class="field"><div class="label">Wedding Date</div><div class="value">{wedding_date}</div></div>' if wedding_date else ''}
            <div class="field">
                <div class="label">Message</div>
                <div class="value">{message}</div>
            </div>
        </div>
    </div>
</body>
</html>
"""

        # For now, send to a placeholder - in production, set an admin email
        admin_email = "delivered@resend.dev"  # Resend's test email that always succeeds

        return await self.send_email(
            to_email=admin_email,
            subject=f"Contact Form: {name}",
            html_content=html_content,
        )


# Singleton instance
email_service = EmailService()
