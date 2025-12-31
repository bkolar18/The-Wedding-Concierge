"""Database configuration and session management."""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from .config import settings


def get_database_url() -> str:
    """Convert DATABASE_URL to async format if needed."""
    url = settings.DATABASE_URL
    # Render provides postgres:// but asyncpg needs postgresql+asyncpg://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


# Create async engine
engine = create_async_engine(
    get_database_url(),
    echo=settings.DEBUG,
    future=True,
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    # Import models to ensure they're registered
    from models import wedding, user, chat  # noqa

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Run any needed migrations for existing tables
    await run_migrations()


async def run_migrations():
    """Run database migrations for schema changes."""
    from sqlalchemy import text

    migrations = [
        # Expand dress_code from VARCHAR(100) to TEXT
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'weddings' AND column_name = 'dress_code'
                AND data_type = 'character varying'
            ) THEN
                ALTER TABLE weddings ALTER COLUMN dress_code TYPE TEXT;
            END IF;
        END $$;
        """,
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'wedding_events' AND column_name = 'dress_code'
                AND data_type = 'character varying'
            ) THEN
                ALTER TABLE wedding_events ALTER COLUMN dress_code TYPE TEXT;
            END IF;
        END $$;
        """,
    ]

    async with engine.begin() as conn:
        for migration in migrations:
            try:
                await conn.execute(text(migration))
            except Exception as e:
                # Log but don't fail - migration might not apply to this DB type
                import logging
                logging.getLogger(__name__).debug(f"Migration skipped: {e}")
