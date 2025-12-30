import asyncio
import sys

async def test():
    print("Starting test...", flush=True)

    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker, selectinload
    from sqlalchemy import select

    from core.config import settings
    from models.wedding import Wedding
    from models.chat import ChatSession, ChatMessage
    from services.chat import ChatEngine

    print(f"API Key configured: {bool(settings.ANTHROPIC_API_KEY)}", flush=True)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Get a chat session
        result = await db.execute(
            select(ChatSession).limit(1)
        )
        session = result.scalar_one_or_none()

        if not session:
            print("No chat session found!", flush=True)
            return

        print(f"Found session: {session.id}", flush=True)

        # Get wedding with selectinload
        result = await db.execute(
            select(Wedding)
            .options(
                selectinload(Wedding.accommodations),
                selectinload(Wedding.events),
                selectinload(Wedding.faqs)
            )
            .where(Wedding.id == session.wedding_id)
        )
        wedding = result.scalar_one_or_none()

        if not wedding:
            print("Wedding not found!", flush=True)
            return

        print(f"Found wedding: {wedding.partner1_name} & {wedding.partner2_name}", flush=True)

        # Now try to build the dict - this is where it might fail
        print("Building wedding_data dict...", flush=True)
        try:
            wedding_data = {
                "partner1_name": wedding.partner1_name,
                "partner2_name": wedding.partner2_name,
                "wedding_date": wedding.wedding_date,
                "wedding_time": wedding.wedding_time,
                "dress_code": wedding.dress_code,
                "ceremony_venue_name": wedding.ceremony_venue_name,
                "ceremony_venue_address": wedding.ceremony_venue_address,
                "ceremony_venue_url": wedding.ceremony_venue_url,
                "reception_venue_name": wedding.reception_venue_name,
                "reception_venue_address": wedding.reception_venue_address,
                "reception_venue_url": wedding.reception_venue_url,
                "reception_time": wedding.reception_time,
                "registry_urls": wedding.registry_urls,
                "wedding_website_url": wedding.wedding_website_url,
                "rsvp_url": wedding.rsvp_url,
                "additional_notes": wedding.additional_notes,
                "accommodations": [
                    {
                        "hotel_name": acc.hotel_name,
                        "address": acc.address,
                        "phone": acc.phone,
                        "distance_to_venue": acc.distance_to_venue,
                        "has_room_block": acc.has_room_block,
                        "room_block_name": acc.room_block_name,
                        "room_block_code": acc.room_block_code,
                        "room_block_rate": acc.room_block_rate,
                        "room_block_deadline": acc.room_block_deadline,
                        "booking_url": acc.booking_url,
                        "notes": acc.notes,
                    }
                    for acc in wedding.accommodations
                ],
                "events": [
                    {
                        "event_name": event.event_name,
                        "event_date": event.event_date,
                        "event_time": event.event_time,
                        "venue_name": event.venue_name,
                        "venue_address": event.venue_address,
                        "dress_code": event.dress_code,
                        "description": event.description,
                    }
                    for event in wedding.events
                ],
                "faqs": [
                    {
                        "question": faq.question,
                        "answer": faq.answer,
                    }
                    for faq in wedding.faqs
                ],
            }
            print(f"Dict built successfully! Accommodations: {len(wedding_data['accommodations'])}", flush=True)
        except Exception as e:
            print(f"ERROR building dict: {type(e).__name__}: {e}", flush=True)
            import traceback
            traceback.print_exc()
            return

        # Now call the chat engine
        print("Calling ChatEngine...", flush=True)
        try:
            chat_engine = ChatEngine()
            response = await chat_engine.chat(
                wedding_data=wedding_data,
                message="What is the dress code?",
                conversation_history=[]
            )
            print(f"SUCCESS! Response: {response}", flush=True)
        except Exception as e:
            print(f"ERROR calling chat: {type(e).__name__}: {e}", flush=True)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
