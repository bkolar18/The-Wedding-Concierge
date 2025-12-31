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
        "https://the-wedding-concierge-*.vercel.app",  # Vercel preview deployments
    ],
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
    from core.database import init_db
    await init_db()
    logger.info("Database tables initialized")


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown."""
    pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
