"""Test script to verify the Wedding Chat Tool setup."""
import asyncio
import sys
sys.path.insert(0, '.')

async def main():
    print("=" * 50)
    print("Wedding Chat Tool - Setup Test")
    print("=" * 50)

    # Test 1: Import core modules
    print("\n1. Testing imports...")
    try:
        from core.config import settings
        from core.database import Base, init_db, engine
        from models.wedding import Wedding, WeddingEvent, WeddingAccommodation, WeddingFAQ
        from models.chat import ChatSession, ChatMessage
        from models.user import User
        from services.chat import ChatEngine
        print("   [OK] All imports successful")
    except Exception as e:
        print(f"   [FAIL] Import error: {e}")
        return

    # Test 2: Check settings
    print("\n2. Testing settings...")
    print(f"   App Name: {settings.APP_NAME}")
    print(f"   Database: {settings.DATABASE_URL}")
    print(f"   LLM Model: {settings.LLM_MODEL}")
    print(f"   Anthropic API Key: {'Set' if settings.ANTHROPIC_API_KEY else 'Not set'}")

    # Test 3: Initialize database
    print("\n3. Testing database initialization...")
    try:
        await init_db()
        print("   [OK] Database tables created")
    except Exception as e:
        print(f"   [FAIL] Database error: {e}")
        return

    # Test 4: Create a test wedding
    print("\n4. Testing wedding creation...")
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from core.database import async_session_maker

    wedding_id = None
    async with async_session_maker() as session:
        try:
            # Check if test wedding already exists
            result = await session.execute(
                select(Wedding).where(Wedding.access_code == "alice-bob-test")
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"   [OK] Test wedding already exists: {existing}")
                wedding_id = existing.id
            else:
                # Create test wedding
                wedding = Wedding(
                    partner1_name="Alice Smith",
                    partner2_name="Bob Jones",
                    couple_email="alice.bob@test.com",
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
                wedding_id = wedding.id
                print(f"   [OK] Created wedding: {wedding}")
                print(f"   Wedding ID: {wedding.id}")
                print(f"   Access Code: {wedding.access_code}")

                # Add accommodation
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
                print(f"   [OK] Added accommodation: {accommodation.hotel_name}")

        except Exception as e:
            print(f"   [FAIL] Database error: {e}")
            await session.rollback()
            return

    # Test 5: Test chat engine (without API call)
    print("\n5. Testing chat engine initialization...")
    try:
        chat_engine = ChatEngine()

        # Build context - need to load all relationships eagerly
        async with async_session_maker() as session:
            result = await session.execute(
                select(Wedding)
                .options(
                    selectinload(Wedding.accommodations),
                    selectinload(Wedding.events),
                    selectinload(Wedding.faqs)
                )
                .where(Wedding.id == wedding_id)
            )
            wedding = result.scalar_one()

            # Access relationships while still in session context
            # to ensure they're loaded
            accs = list(wedding.accommodations)
            events = list(wedding.events)
            faqs = list(wedding.faqs)

            # Now build context
            context = chat_engine.build_wedding_context(wedding)
            print("   [OK] Chat engine initialized")
            print(f"   Context length: {len(context)} chars")
            print(f"   Accommodations loaded: {len(accs)}")

    except Exception as e:
        import traceback
        print(f"   [FAIL] Chat engine error: {e}")
        traceback.print_exc()
        return

    # Test 6: Test FastAPI app
    print("\n6. Testing FastAPI app import...")
    try:
        from main import app
        print(f"   [OK] FastAPI app loaded: {app.title}")
        print(f"   Routes: {len(app.routes)}")
    except Exception as e:
        print(f"   [FAIL] FastAPI error: {e}")
        return

    print("\n" + "=" * 50)
    print("ALL TESTS PASSED!")
    print("=" * 50)
    print("\nTo start the server, run:")
    print("  cd backend")
    print('  venv\\Scripts\\python -m uvicorn main:app --reload')
    print("\nThen open http://localhost:8000/docs for API documentation")
    print("\nTest access code: alice-bob-test")


if __name__ == "__main__":
    asyncio.run(main())
