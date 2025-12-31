"""Background jobs for SMS scheduling using APScheduler."""

import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import async_session_maker
from models.sms import ScheduledMessage, Guest, MessageLog
from models.wedding import Wedding
from services.sms.twilio_service import TwilioService
from services.sms.template_service import TemplateService

logger = logging.getLogger(__name__)


async def process_relative_schedules():
    """
    Process messages with relative scheduling.

    This job runs daily and finds messages scheduled relative to wedding_date
    or rsvp_deadline. When the calculated send date matches today, it sends
    the messages.
    """
    logger.info("Running process_relative_schedules job")

    async with async_session_maker() as db:
        # Find all relative scheduled messages that haven't been sent
        stmt = select(ScheduledMessage).where(
            ScheduledMessage.schedule_type == "relative",
            ScheduledMessage.status == "scheduled"
        ).options(selectinload(ScheduledMessage.wedding))

        result = await db.execute(stmt)
        messages = result.scalars().all()

        today = datetime.now().date()
        twilio_service = TwilioService()
        template_service = TemplateService()

        for msg in messages:
            try:
                # Calculate the actual send date
                send_date = calculate_send_date(msg, msg.wedding)

                if send_date is None:
                    logger.warning(f"Could not calculate send date for message {msg.id}")
                    continue

                if send_date == today:
                    logger.info(f"Processing relative message {msg.id} for wedding {msg.wedding_id}")
                    await send_scheduled_message(db, msg, twilio_service, template_service)

            except Exception as e:
                logger.error(f"Error processing message {msg.id}: {e}")
                msg.status = "failed"
                await db.commit()


def calculate_send_date(msg: ScheduledMessage, wedding: Wedding) -> Optional[datetime]:
    """Calculate the actual send date from relative scheduling."""
    if not msg.relative_to or msg.relative_days is None:
        return None

    base_date = None

    if msg.relative_to == "wedding_date" and wedding.wedding_date:
        base_date = wedding.wedding_date
    elif msg.relative_to == "rsvp_deadline" and wedding.rsvp_deadline:
        base_date = wedding.rsvp_deadline

    if base_date is None:
        return None

    # relative_days is negative for "before" (e.g., -7 = 7 days before)
    return base_date + timedelta(days=msg.relative_days)


async def send_scheduled_message(
    db: AsyncSession,
    msg: ScheduledMessage,
    twilio_service: TwilioService,
    template_service: TemplateService
):
    """Send a scheduled message to all targeted guests."""

    # Update status to sending
    msg.status = "sending"
    await db.commit()

    # Get wedding for template rendering
    wedding = msg.wedding

    # Get targeted guests
    guests = await get_target_guests(db, msg)

    sent_count = 0
    failed_count = 0

    for guest in guests:
        if guest.opted_out or not guest.sms_consent:
            continue

        try:
            # Render message content with guest variables
            content = template_service.render(msg.message_content, guest, wedding)

            # Send via Twilio
            result = await twilio_service.send_sms(guest.phone_number, content)

            # Log the message
            log = MessageLog(
                wedding_id=msg.wedding_id,
                guest_id=guest.id,
                scheduled_message_id=msg.id,
                phone_number=guest.phone_number,
                message_content=content,
                twilio_sid=result.get("sid"),
                status="sent" if result.get("success") else "failed",
                error_message=result.get("error"),
                sent_at=datetime.utcnow()
            )
            db.add(log)

            if result.get("success"):
                sent_count += 1
            else:
                failed_count += 1

        except Exception as e:
            logger.error(f"Error sending to guest {guest.id}: {e}")
            failed_count += 1

    # Update message status
    msg.sent_count = sent_count
    msg.failed_count = failed_count
    msg.status = "sent" if failed_count == 0 else ("partial" if sent_count > 0 else "failed")
    await db.commit()

    logger.info(f"Scheduled message {msg.id}: sent={sent_count}, failed={failed_count}")


async def get_target_guests(db: AsyncSession, msg: ScheduledMessage) -> list[Guest]:
    """Get the guests targeted by a scheduled message."""

    stmt = select(Guest).where(
        Guest.wedding_id == msg.wedding_id,
        Guest.opted_out == False,
        Guest.sms_consent == True
    )

    if msg.recipient_type == "group" and msg.recipient_filter:
        group_name = msg.recipient_filter.get("group")
        if group_name:
            stmt = stmt.where(Guest.group_name == group_name)

    elif msg.recipient_type == "individual" and msg.recipient_filter:
        guest_ids = msg.recipient_filter.get("guest_ids", [])
        if guest_ids:
            stmt = stmt.where(Guest.id.in_(guest_ids))

    # "all" type doesn't need additional filtering

    result = await db.execute(stmt)
    return result.scalars().all()


async def process_fixed_schedules():
    """
    Process messages with fixed-date scheduling.

    This handles messages scheduled for a specific datetime that weren't
    sent via Twilio's native scheduling (fallback for immediate sends).
    """
    logger.info("Running process_fixed_schedules job")

    async with async_session_maker() as db:
        now = datetime.utcnow()

        # Find fixed-schedule messages due to be sent
        stmt = select(ScheduledMessage).where(
            ScheduledMessage.schedule_type == "fixed",
            ScheduledMessage.status == "scheduled",
            ScheduledMessage.scheduled_at <= now
        ).options(selectinload(ScheduledMessage.wedding))

        result = await db.execute(stmt)
        messages = result.scalars().all()

        twilio_service = TwilioService()
        template_service = TemplateService()

        for msg in messages:
            try:
                logger.info(f"Processing fixed message {msg.id}")
                await send_scheduled_message(db, msg, twilio_service, template_service)
            except Exception as e:
                logger.error(f"Error processing message {msg.id}: {e}")
                msg.status = "failed"
                await db.commit()


async def retry_failed_messages():
    """Retry failed messages up to 3 times."""
    logger.info("Running retry_failed_messages job")

    async with async_session_maker() as db:
        # Find failed message logs that haven't been retried 3 times
        stmt = select(MessageLog).where(
            MessageLog.status == "failed",
            MessageLog.retry_count < 3
        )

        result = await db.execute(stmt)
        logs = result.scalars().all()

        twilio_service = TwilioService()

        for log in logs:
            try:
                result = await twilio_service.send_sms(log.phone_number, log.message_content)

                if result.get("success"):
                    log.status = "sent"
                    log.twilio_sid = result.get("sid")
                else:
                    log.retry_count += 1
                    log.error_message = result.get("error")

                await db.commit()

            except Exception as e:
                logger.error(f"Error retrying message {log.id}: {e}")
                log.retry_count += 1
                await db.commit()
