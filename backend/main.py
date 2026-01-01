"""The Wedding Concierge - FastAPI Application."""
import logging
import sys

# Configure logging to stderr
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger(__name__)
logger.error("=== MAIN.PY STARTING ===")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback

from core.config import settings
from api.routes import chat, wedding, health, auth, scrape, sms

app = FastAPI(
    title=settings.APP_NAME,
    description="Personal wedding concierge for guests",
    version="0.1.0",
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all exceptions and log them."""
    with open("error.log", "a") as f:
        f.write(f"=== GLOBAL ERROR ===\n")
        f.write(f"URL: {request.url}\n")
        f.write(f"ERROR: {type(exc).__name__}: {exc}\n")
        traceback.print_exc(file=f)
        f.write("\n")
        f.flush()
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {str(exc)}"}
    )

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # Next.js dev (alternate port)
        "http://127.0.0.1:3001",
        "https://the-wedding-concierge.vercel.app",  # Production frontend
    ],
    allow_origin_regex=r"https://the-wedding-concierge(-[a-z0-9]+)?\.vercel\.app",  # Vercel preview deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(wedding.router, prefix="/api/wedding", tags=["wedding"])
app.include_router(scrape.router, prefix="/api/scrape", tags=["scrape"])
app.include_router(sms.router, prefix="/api/wedding", tags=["sms"])  # SMS routes under /api/wedding/{id}/...


@app.on_event("startup")
async def startup():
    """Initialize services on startup."""
    from core.database import init_db, async_session_maker
    from sqlalchemy import select
    await init_db()
    logger.info("Database tables initialized")

    # Seed demo wedding if it doesn't exist
    try:
        from datetime import date, timedelta
        from models.wedding import Wedding, WeddingAccommodation, WeddingEvent, WeddingFAQ
        async with async_session_maker() as session:
            result = await session.execute(
                select(Wedding).where(Wedding.access_code == "alice-bob-test")
            )
            existing = result.scalar_one_or_none()

            # Check if demo needs to be recreated (missing FAQs means old version)
            if existing:
                from sqlalchemy.orm import selectinload
                result = await session.execute(
                    select(Wedding)
                    .options(selectinload(Wedding.faqs))
                    .where(Wedding.access_code == "alice-bob-test")
                )
                existing = result.scalar_one()
                if not existing.faqs:
                    # Delete old demo and recreate with full data
                    await session.delete(existing)
                    await session.commit()
                    existing = None
                    logger.info("Deleted old demo wedding to recreate with full data")

            if not existing:
                # Set wedding date to 3 months from now
                wedding_date = date.today() + timedelta(days=90)
                rsvp_deadline = wedding_date - timedelta(days=30)

                wedding = Wedding(
                    partner1_name="Alice Smith",
                    partner2_name="Bob Jones",
                    couple_email="demo@weddingconcierge.com",
                    wedding_date=wedding_date,
                    wedding_time="4:00 PM",
                    dress_code="Black Tie Optional. Gentlemen: dark suits or tuxedos. Ladies: formal evening gowns or elegant cocktail dresses. Please avoid white or ivory.",
                    ceremony_venue_name="The Plaza Hotel - Grand Ballroom",
                    ceremony_venue_address="768 5th Avenue, New York, NY 10019",
                    reception_venue_name="The Plaza Hotel - Terrace Room",
                    reception_venue_address="768 5th Avenue, New York, NY 10019",
                    reception_time="6:00 PM",
                    access_code="alice-bob-test",
                    rsvp_deadline=rsvp_deadline,
                    rsvp_url="https://theknot.com/alice-and-bob/rsvp",
                    wedding_website_url="https://theknot.com/alice-and-bob",
                    additional_notes="Ceremony and reception will both be held at The Plaza Hotel. Cocktail hour begins at 5:00 PM on the Terrace."
                )
                session.add(wedding)
                await session.commit()
                await session.refresh(wedding)

                # Add accommodations
                accommodations = [
                    WeddingAccommodation(
                        wedding_id=wedding.id,
                        hotel_name="The Plaza Hotel",
                        address="768 5th Avenue, New York, NY 10019",
                        phone="(212) 759-3000",
                        website_url="https://www.theplazany.com",
                        has_room_block=True,
                        room_block_name="Smith-Jones Wedding",
                        room_block_code="SMITHJONES2025",
                        room_block_rate="$450/night (normally $650)",
                        room_block_deadline=rsvp_deadline,
                        distance_to_venue="You're already here!",
                        notes="Book early - our room block is limited to 30 rooms."
                    ),
                    WeddingAccommodation(
                        wedding_id=wedding.id,
                        hotel_name="The Peninsula New York",
                        address="700 5th Avenue, New York, NY 10019",
                        phone="(212) 956-2888",
                        website_url="https://www.peninsula.com/new-york",
                        has_room_block=False,
                        distance_to_venue="2 minute walk",
                        notes="Luxury alternative just steps from The Plaza."
                    ),
                    WeddingAccommodation(
                        wedding_id=wedding.id,
                        hotel_name="Park Lane Hotel",
                        address="36 Central Park S, New York, NY 10019",
                        phone="(212) 371-4000",
                        has_room_block=False,
                        distance_to_venue="5 minute walk",
                        notes="Great views of Central Park, more budget-friendly option."
                    )
                ]
                session.add_all(accommodations)

                # Add events
                events = [
                    WeddingEvent(
                        wedding_id=wedding.id,
                        event_name="Welcome Drinks",
                        event_date=wedding_date - timedelta(days=1),
                        event_time="7:00 PM - 10:00 PM",
                        venue_name="The Campbell",
                        venue_address="15 Vanderbilt Avenue, New York, NY 10017",
                        description="Join us for casual welcome drinks at this stunning Grand Central bar! Drinks and light bites provided.",
                        dress_code="Smart Casual"
                    ),
                    WeddingEvent(
                        wedding_id=wedding.id,
                        event_name="Ceremony",
                        event_date=wedding_date,
                        event_time="4:00 PM",
                        venue_name="The Plaza Hotel - Grand Ballroom",
                        venue_address="768 5th Avenue, New York, NY 10019",
                        description="Please arrive by 3:30 PM to be seated.",
                        dress_code="Black Tie Optional"
                    ),
                    WeddingEvent(
                        wedding_id=wedding.id,
                        event_name="Cocktail Hour",
                        event_date=wedding_date,
                        event_time="5:00 PM",
                        venue_name="The Plaza Hotel - Terrace",
                        venue_address="768 5th Avenue, New York, NY 10019",
                        description="Enjoy cocktails and hors d'oeuvres while we take photos."
                    ),
                    WeddingEvent(
                        wedding_id=wedding.id,
                        event_name="Reception & Dinner",
                        event_date=wedding_date,
                        event_time="6:00 PM - 11:00 PM",
                        venue_name="The Plaza Hotel - Terrace Room",
                        venue_address="768 5th Avenue, New York, NY 10019",
                        description="Dinner, dancing, and celebration!"
                    ),
                    WeddingEvent(
                        wedding_id=wedding.id,
                        event_name="After Party",
                        event_date=wedding_date,
                        event_time="11:00 PM - 2:00 AM",
                        venue_name="The Oak Room at The Plaza",
                        venue_address="768 5th Avenue, New York, NY 10019",
                        description="Keep the party going! Casual attire welcome.",
                        dress_code="Come as you are"
                    ),
                    WeddingEvent(
                        wedding_id=wedding.id,
                        event_name="Farewell Brunch",
                        event_date=wedding_date + timedelta(days=1),
                        event_time="10:00 AM - 12:00 PM",
                        venue_name="Sarabeth's Central Park South",
                        venue_address="40 Central Park S, New York, NY 10019",
                        description="Join us for a casual farewell brunch before you head home!",
                        dress_code="Casual"
                    )
                ]
                session.add_all(events)

                # Add FAQs
                faqs = [
                    WeddingFAQ(
                        wedding_id=wedding.id,
                        question="What are the food options at the reception?",
                        answer="We're offering a plated dinner with three entrée choices: Filet Mignon, Pan-Seared Salmon, or Wild Mushroom Risotto (vegetarian). Please indicate your choice when you RSVP. We can accommodate dietary restrictions - just let us know! The cocktail hour will feature passed hors d'oeuvres including shrimp cocktail, beef sliders, and vegetarian options.",
                        category="Food & Drinks"
                    ),
                    WeddingFAQ(
                        wedding_id=wedding.id,
                        question="Will there be an open bar?",
                        answer="Yes! We'll have a full open bar throughout cocktail hour and the reception, featuring premium spirits, wine, beer, and signature cocktails. Non-alcoholic options will also be available.",
                        category="Food & Drinks"
                    ),
                    WeddingFAQ(
                        wedding_id=wedding.id,
                        question="What is there to do in New York City?",
                        answer="So much! Here are our top recommendations near the venue:\n\n• Central Park - Right across the street! Perfect for a morning walk or run\n• Museum Mile - The Met, Guggenheim, and more are a short walk away\n• 5th Avenue Shopping - World-class stores within walking distance\n• Broadway - Catch a show! The Theater District is a 15-minute walk\n• Top of the Rock - Amazing views of the city\n• Times Square - The iconic NYC experience (15 min walk)\n• Grand Central Terminal - Beautiful architecture and great food hall",
                        category="Local Activities"
                    ),
                    WeddingFAQ(
                        wedding_id=wedding.id,
                        question="What restaurants do you recommend?",
                        answer="Some of our NYC favorites:\n\n• The Smith (Midtown) - Great American fare, perfect for groups\n• Carbone - Incredible Italian (book ahead!)\n• Le Bernardin - World-class seafood (splurge-worthy)\n• Joe's Pizza - Best NYC slice\n• Katz's Delicatessen - Iconic pastrami sandwiches\n• The Modern at MoMA - Fine dining with museum views\n• Shake Shack (Madison Square Park) - The original location!",
                        category="Local Activities"
                    ),
                    WeddingFAQ(
                        wedding_id=wedding.id,
                        question="Is parking available?",
                        answer="The Plaza has valet parking available for $75/night. There are also several parking garages nearby on 58th and 59th Streets ($40-60/day). However, we recommend taking a taxi, Uber, or the subway - traffic in Midtown can be unpredictable!",
                        category="Transportation"
                    ),
                    WeddingFAQ(
                        wedding_id=wedding.id,
                        question="How do I get from the airport?",
                        answer="From JFK: Taxi/Uber is about 45-60 minutes ($70-90). The AirTrain + subway is cheaper but takes longer.\n\nFrom LaGuardia: Taxi/Uber is about 30-40 minutes ($40-50).\n\nFrom Newark: Taxi/Uber is about 45-60 minutes ($80-100). NJ Transit + subway is an option too.\n\nWe recommend scheduling your ride in advance, especially during rush hour!",
                        category="Transportation"
                    ),
                    WeddingFAQ(
                        wedding_id=wedding.id,
                        question="Can I bring a plus one?",
                        answer="Due to venue capacity, we can only accommodate guests named on the invitation. Please check your invitation for the names included. If you have questions, reach out to us directly!",
                        category="RSVP"
                    ),
                    WeddingFAQ(
                        wedding_id=wedding.id,
                        question="Are children welcome?",
                        answer="While we love your little ones, we've decided to make this an adults-only celebration. We hope this gives you a chance to enjoy a night out! Please reach out if you need babysitter recommendations in the city.",
                        category="RSVP"
                    ),
                    WeddingFAQ(
                        wedding_id=wedding.id,
                        question="What's the weather like?",
                        answer="New York in spring can be unpredictable! Expect temperatures between 50-70°F. We recommend bringing a light jacket for the evening. The ceremony and reception are indoors, so you'll be comfortable regardless of weather.",
                        category="General"
                    )
                ]
                session.add_all(faqs)

                await session.commit()
                logger.info("Demo wedding 'alice-bob-test' created with full NYC details")
            else:
                logger.info("Demo wedding already exists")
    except Exception as e:
        logger.error(f"Failed to seed demo wedding: {e}")

    # Initialize APScheduler for SMS background jobs
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger
        from services.sms import jobs

        scheduler = AsyncIOScheduler()

        # Process relative schedules daily at 8 AM
        scheduler.add_job(
            jobs.process_relative_schedules,
            CronTrigger(hour=8, minute=0),
            id="process_relative_schedules",
            replace_existing=True
        )

        # Process fixed schedules every 5 minutes
        scheduler.add_job(
            jobs.process_fixed_schedules,
            IntervalTrigger(minutes=5),
            id="process_fixed_schedules",
            replace_existing=True
        )

        # Retry failed messages every 15 minutes
        scheduler.add_job(
            jobs.retry_failed_messages,
            IntervalTrigger(minutes=15),
            id="retry_failed_messages",
            replace_existing=True
        )

        scheduler.start()
        app.state.scheduler = scheduler
        logger.info("SMS scheduler initialized with 3 background jobs")
    except ImportError:
        logger.warning("APScheduler not installed, SMS scheduling disabled")
    except Exception as e:
        logger.error(f"Failed to initialize scheduler: {e}")


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown."""
    # Shutdown the scheduler gracefully
    if hasattr(app.state, 'scheduler'):
        app.state.scheduler.shutdown(wait=False)
        logger.info("SMS scheduler shut down")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
