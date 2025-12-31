"""Twilio SMS service for sending and scheduling messages."""
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Tuple
from concurrent.futures import ThreadPoolExecutor

import phonenumbers
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from core.config import settings


class TwilioService:
    """Async-compatible Twilio SMS service."""

    def __init__(self):
        """Initialize Twilio client."""
        self._client: Optional[Client] = None
        self._executor = ThreadPoolExecutor(max_workers=5)

    @property
    def client(self) -> Client:
        """Lazy initialization of Twilio client."""
        if self._client is None:
            if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
                raise ValueError("Twilio credentials not configured")
            self._client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
        return self._client

    @property
    def is_configured(self) -> bool:
        """Check if Twilio is properly configured."""
        return bool(
            settings.TWILIO_ACCOUNT_SID
            and settings.TWILIO_AUTH_TOKEN
            and settings.TWILIO_PHONE_NUMBER
        )

    def validate_phone_number(self, phone: str, region: str = "US") -> Tuple[bool, str, Optional[str]]:
        """
        Validate and format phone number to E.164.

        Returns:
            Tuple of (is_valid, formatted_number or error_message, country_code)
        """
        try:
            parsed = phonenumbers.parse(phone, region)
            if not phonenumbers.is_valid_number(parsed):
                return False, "Invalid phone number", None

            formatted = phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )
            country_code = phonenumbers.region_code_for_number(parsed)
            return True, formatted, country_code
        except phonenumbers.NumberParseException as e:
            return False, str(e), None

    def _send_sms_sync(self, to: str, body: str, schedule_at: Optional[datetime] = None) -> dict:
        """
        Synchronous SMS send (runs in thread pool).

        Args:
            to: Phone number in E.164 format
            body: Message content
            schedule_at: Optional datetime to schedule the message

        Returns:
            Dict with sid, status, and other message details
        """
        try:
            # Build message parameters
            params = {
                "to": to,
                "body": body,
            }

            # Use messaging service if available, otherwise use phone number
            if settings.TWILIO_MESSAGING_SERVICE_SID:
                params["messaging_service_sid"] = settings.TWILIO_MESSAGING_SERVICE_SID
            else:
                params["from_"] = settings.TWILIO_PHONE_NUMBER

            # Add scheduling if requested (Twilio requires at least 15 min ahead)
            if schedule_at:
                # Ensure it's at least 15 minutes in the future
                min_schedule = datetime.utcnow() + timedelta(minutes=15)
                if schedule_at < min_schedule:
                    schedule_at = min_schedule

                params["send_at"] = schedule_at.isoformat() + "Z"
                params["schedule_type"] = "fixed"

            message = self.client.messages.create(**params)

            return {
                "success": True,
                "sid": message.sid,
                "status": message.status,
                "to": message.to,
                "date_created": str(message.date_created),
                "error_code": message.error_code,
                "error_message": message.error_message,
            }

        except TwilioRestException as e:
            return {
                "success": False,
                "sid": None,
                "status": "failed",
                "to": to,
                "error_code": str(e.code),
                "error_message": e.msg,
            }

    async def send_sms(self, to: str, body: str) -> dict:
        """
        Send SMS immediately (async).

        Args:
            to: Phone number in E.164 format
            body: Message content (will have opt-out text appended)

        Returns:
            Dict with sid, status, and other details
        """
        # Ensure opt-out text is included (TCPA compliance)
        if "STOP" not in body.upper():
            body = body.rstrip() + "\n\nReply STOP to unsubscribe"

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._executor,
            self._send_sms_sync,
            to,
            body,
            None
        )

    async def schedule_sms(self, to: str, body: str, send_at: datetime) -> dict:
        """
        Schedule SMS for future delivery (async).

        Args:
            to: Phone number in E.164 format
            body: Message content
            send_at: When to send (must be 15 min to 35 days in future)

        Returns:
            Dict with sid, status, and other details
        """
        # Ensure opt-out text is included
        if "STOP" not in body.upper():
            body = body.rstrip() + "\n\nReply STOP to unsubscribe"

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._executor,
            self._send_sms_sync,
            to,
            body,
            send_at
        )

    def _cancel_message_sync(self, message_sid: str) -> dict:
        """Cancel a scheduled message (sync)."""
        try:
            message = self.client.messages(message_sid).update(status="canceled")
            return {
                "success": True,
                "sid": message.sid,
                "status": message.status,
            }
        except TwilioRestException as e:
            return {
                "success": False,
                "sid": message_sid,
                "error_code": str(e.code),
                "error_message": e.msg,
            }

    async def cancel_scheduled(self, message_sid: str) -> dict:
        """Cancel a scheduled message (async)."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._executor,
            self._cancel_message_sync,
            message_sid
        )

    def _get_message_status_sync(self, message_sid: str) -> dict:
        """Get message status (sync)."""
        try:
            message = self.client.messages(message_sid).fetch()
            return {
                "success": True,
                "sid": message.sid,
                "status": message.status,
                "to": message.to,
                "date_sent": str(message.date_sent) if message.date_sent else None,
                "error_code": message.error_code,
                "error_message": message.error_message,
            }
        except TwilioRestException as e:
            return {
                "success": False,
                "sid": message_sid,
                "error_code": str(e.code),
                "error_message": e.msg,
            }

    async def get_message_status(self, message_sid: str) -> dict:
        """Get the current status of a message (async)."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._executor,
            self._get_message_status_sync,
            message_sid
        )

    def is_quiet_hours(self, hour: int) -> bool:
        """
        Check if current time is during quiet hours (TCPA compliance).
        No SMS before 8 AM or after 9 PM.

        Args:
            hour: Hour in 24-hour format (0-23)

        Returns:
            True if in quiet hours (should not send)
        """
        return hour < 8 or hour >= 21


# Singleton instance
twilio_service = TwilioService()
