"""Application configuration."""
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

# Get the backend directory (where this config.py lives is in core/, so go up one level)
BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"


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

    # LLM
    ANTHROPIC_API_KEY: Optional[str] = None
    LLM_MODEL: str = "claude-3-5-haiku-20241022"  # Haiku for chat (cheaper), Sonnet hardcoded in data_mapper for scraping

    # Twilio SMS
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    TWILIO_MESSAGING_SERVICE_SID: Optional[str] = None  # For A2P 10DLC compliance

    class Config:
        env_file = str(ENV_FILE)
        case_sensitive = True


settings = Settings()
