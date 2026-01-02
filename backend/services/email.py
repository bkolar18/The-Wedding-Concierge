"""Email service for sending transactional emails."""
import asyncio
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from core.config import settings


class EmailService:
    """Service for sending emails via SMTP."""

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME

    @property
    def is_configured(self) -> bool:
        """Check if email service is configured."""
        return bool(self.host and self.user and self.password)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email asynchronously."""
        if not self.is_configured:
            print(f"[Email] SMTP not configured. Would send to {to_email}: {subject}")
            return True  # Return True in dev mode so flow continues

        # Run in thread pool to not block async
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._send_email_sync,
            to_email,
            subject,
            html_content,
            text_content
        )

    def _send_email_sync(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email synchronously (called in thread pool)."""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Add plain text version if provided
            if text_content:
                part1 = MIMEText(text_content, "plain")
                message.attach(part1)

            # Add HTML version
            part2 = MIMEText(html_content, "html")
            message.attach(part2)

            # Create secure connection
            context = ssl.create_default_context()

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls(context=context)
                server.login(self.user, self.password)
                server.sendmail(self.from_email, to_email, message.as_string())

            print(f"[Email] Sent successfully to {to_email}")
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

        text_content = f"""
{greeting}

We received a request to reset your password.

Reset your password here: {reset_url}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

- The Wedding Concierge Team
"""

        return await self.send_email(
            to_email=to_email,
            subject="Reset Your Password - The Wedding Concierge",
            html_content=html_content,
            text_content=text_content
        )


# Singleton instance
email_service = EmailService()
