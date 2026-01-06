"""Application configuration."""
import os
import secrets
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional

# Get the backend directory (where this config.py lives is in core/, so go up one level)
BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"

# Check if we're in production (Render sets this, or check for production database)
IS_PRODUCTION = os.getenv("RENDER") is not None or "postgresql" in os.getenv("DATABASE_URL", "")


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "The Wedding Concierge"
    DEBUG: bool = False

    # Database - default to SQLite for easy testing
    DATABASE_URL: str = "sqlite+aiosqlite:///./wedding_chat.db"

    # Auth
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Ensure SECRET_KEY is not the default in production."""
        insecure_defaults = ["change-me-in-production", "change-me-to-a-random-string-in-production"]
        if IS_PRODUCTION and v in insecure_defaults:
            raise ValueError(
                "SECRET_KEY must be set to a secure random value in production. "
                f"Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        if v in insecure_defaults:
            import logging
            logging.warning("WARNING: Using insecure default SECRET_KEY. Set a secure value for production!")
        return v

    # LLM
    ANTHROPIC_API_KEY: Optional[str] = None
    LLM_MODEL: str = "claude-3-5-haiku-20241022"  # Haiku for chat (cheaper), Sonnet hardcoded in data_mapper for scraping

    # Twilio SMS
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    TWILIO_MESSAGING_SERVICE_SID: Optional[str] = None  # For A2P 10DLC compliance

    # Email (Resend)
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "The Wedding Concierge <onboarding@resend.dev>"  # Use your verified domain in production

    # Frontend URL for password reset links
    FRONTEND_URL: str = "http://localhost:3000"

    # Stripe Payments
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # Pricing (in cents)
    PRICE_STANDARD_CENTS: int = 4900  # $49.00
    PRICE_PREMIUM_CENTS: int = 9900   # $99.00

    class Config:
        env_file = str(ENV_FILE)
        case_sensitive = True


settings = Settings()
