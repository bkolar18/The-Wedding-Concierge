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
        from models.wedding import Wedding, WeddingAccommodation
        async with async_session_maker() as session:
            result = await session.execute(
                select(Wedding).where(Wedding.access_code == "alice-bob-test")
            )
            existing = result.scalar_one_or_none()

            if not existing:
                wedding = Wedding(
                    partner1_name="Alice Smith",
                    partner2_name="Bob Jones",
                    couple_email="demo@weddingconcierge.com",
                    wedding_date=None,
                    wedding_time="4:00 PM",
                    dress_code="Formal Attire",
                    ceremony_venue_name="The Grand Chapel",
                    ceremony_venue_address="123 Wedding Lane, Love City, CA 90210",
                    reception_venue_name="The Grand Ballroom",
                    reception_venue_address="123 Wedding Lane, Love City, CA 90210",
                    reception_time="6:00 PM",
                    access_code="alice-bob-test"
                )
                session.add(wedding)
                await session.commit()
                await session.refresh(wedding)

                # Add demo accommodation
                accommodation = WeddingAccommodation(
                    wedding_id=wedding.id,
                    hotel_name="The Grand Hotel",
                    address="456 Hotel Blvd, Love City, CA 90210",
                    phone="(555) 123-4567",
                    has_room_block=True,
                    room_block_name="Smith-Jones Wedding",
                    room_block_code="SMITHJONES2025",
                    room_block_rate="$149/night"
                )
                session.add(accommodation)
                await session.commit()
                logger.info("Demo wedding 'alice-bob-test' created")
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
