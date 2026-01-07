"""Email service using Resend."""
import logging
from typing import Optional
from datetime import datetime

import resend

from core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via Resend."""

    def __init__(self):
        self._configured = False

    def _ensure_configured(self):
        """Configure Resend API key."""
        if not self._configured and settings.RESEND_API_KEY:
            resend.api_key = settings.RESEND_API_KEY
            self._configured = True

    @property
    def is_configured(self) -> bool:
        """Check if Resend is properly configured."""
        return bool(settings.RESEND_API_KEY)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
    ) -> dict:
        """
        Send an email via Resend.

        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_content: HTML body of the email

        Returns:
            Dict with success status and details
        """
        if not self.is_configured:
            logger.warning("Resend not configured - email not sent")
            return {"success": False, "error": "Email service not configured"}

        try:
            self._ensure_configured()

            params = {
                "from": settings.EMAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }

            response = resend.Emails.send(params)

            return {
                "success": True,
                "id": response.get("id"),
            }

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return {"success": False, "error": str(e)}

    def generate_weekly_digest_html(
        self,
        partner1_name: str,
        partner2_name: str,
        total_conversations: int,
        total_messages: int,
        unique_guests: int,
        top_topics: list[tuple[str, int]],
        week_start: datetime,
        week_end: datetime,
        dashboard_url: str,
        guests_who_used_chat: int = 0,
        total_guests: int = 0
    ) -> str:
        """
        Generate HTML content for weekly digest email.

        Args:
            partner1_name: First partner's name
            partner2_name: Second partner's name
            total_conversations: Number of chat sessions this week
            total_messages: Number of messages this week
            unique_guests: Number of unique guests who chatted
            top_topics: List of (topic, count) tuples
            week_start: Start of the week
            week_end: End of the week
            dashboard_url: URL to the dashboard
            guests_who_used_chat: Total guests who have used chat (all-time)
            total_guests: Total guests in guest list

        Returns:
            HTML string for the email body
        """
        # Format dates
        week_str = f"{week_start.strftime('%B %d')} - {week_end.strftime('%B %d, %Y')}"

        # Build topics list
        topics_html = ""
        if top_topics:
            topics_html = "<ul style='margin: 0; padding-left: 20px;'>"
            for topic, count in top_topics[:5]:
                topics_html += f"<li style='margin-bottom: 5px;'>{topic}: <strong>{count}</strong> questions</li>"
            topics_html += "</ul>"
        else:
            topics_html = "<p style='color: #666;'>No conversations this week</p>"

        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #fff5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #fce7f3;">
                            <h1 style="margin: 0; color: #be185d; font-size: 24px; font-weight: normal;">
                                The Wedding Concierge
                            </h1>
                            <p style="margin: 10px 0 0; color: #666; font-size: 14px;">
                                Weekly Update for {partner1_name} & {partner2_name}
                            </p>
                        </td>
                    </tr>

                    <!-- Stats Summary -->
                    <tr>
                        <td style="padding: 30px 40px;">
                            <h2 style="margin: 0 0 20px; color: #333; font-size: 18px; font-weight: 600;">
                                Your Week in Numbers
                            </h2>
                            <p style="margin: 0 0 20px; color: #666; font-size: 14px;">
                                {week_str}
                            </p>

                            <!-- Stats Grid -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="33%" style="text-align: center; padding: 20px 10px; background-color: #fdf2f8; border-radius: 8px;">
                                        <div style="font-size: 32px; font-weight: bold; color: #be185d;">{total_conversations}</div>
                                        <div style="font-size: 12px; color: #666; margin-top: 5px;">Conversations</div>
                                    </td>
                                    <td width="10"></td>
                                    <td width="33%" style="text-align: center; padding: 20px 10px; background-color: #fdf2f8; border-radius: 8px;">
                                        <div style="font-size: 32px; font-weight: bold; color: #be185d;">{total_messages}</div>
                                        <div style="font-size: 12px; color: #666; margin-top: 5px;">Messages</div>
                                    </td>
                                    <td width="10"></td>
                                    <td width="33%" style="text-align: center; padding: 20px 10px; background-color: #fdf2f8; border-radius: 8px;">
                                        <div style="font-size: 32px; font-weight: bold; color: #be185d;">{unique_guests}</div>
                                        <div style="font-size: 12px; color: #666; margin-top: 5px;">Guests</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Guest Engagement -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; padding: 20px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h3 style="margin: 0 0 10px; color: #166534; font-size: 16px; font-weight: 600;">
                                            Guest Chat Engagement
                                        </h3>
                                        <p style="margin: 0; color: #15803d; font-size: 28px; font-weight: bold;">
                                            {guests_who_used_chat} of {total_guests}
                                        </p>
                                        <p style="margin: 5px 0 0; color: #666; font-size: 13px;">
                                            guests have used the concierge chat
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Top Topics -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <h2 style="margin: 0 0 15px; color: #333; font-size: 18px; font-weight: 600;">
                                What Guests Asked About
                            </h2>
                            {topics_html}
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <a href="{dashboard_url}" style="display: inline-block; padding: 14px 32px; background-color: #be185d; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                View Full Analytics
                            </a>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: #fdf2f8; border-radius: 0 0 16px 16px; text-align: center;">
                            <p style="margin: 0; color: #666; font-size: 12px;">
                                You're receiving this because you have a wedding on The Wedding Concierge.
                            </p>
                            <p style="margin: 10px 0 0; color: #999; font-size: 11px;">
                                The Wedding Concierge - Your AI Wedding Assistant
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


# Singleton instance
email_service = EmailService()
