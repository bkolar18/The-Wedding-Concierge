"""Add missing columns to weddings table in production."""
import asyncio
import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from core.database import async_engine


async def add_columns():
    """Add missing columns to weddings table."""
    commands = [
        # Chat greeting for custom welcome message
        "ALTER TABLE weddings ADD COLUMN IF NOT EXISTS chat_greeting VARCHAR(500)",

        # Show branding toggle (premium feature)
        "ALTER TABLE weddings ADD COLUMN IF NOT EXISTS show_branding BOOLEAN DEFAULT true",

        # Custom slug for guest self-registration
        "ALTER TABLE weddings ADD COLUMN IF NOT EXISTS custom_slug VARCHAR(100)",
    ]

    async with async_engine.begin() as conn:
        for cmd in commands:
            print(f"Running: {cmd[:60]}...")
            await conn.execute(text(cmd))
            print("OK")

    print("\nAll columns added successfully!")


if __name__ == "__main__":
    asyncio.run(add_columns())
