import asyncio
import sys

async def test():
    print("Starting test...", flush=True)

    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker, selectinload
    from sqlalchemy import select

    from core.config import settings
    from models.wedding import Wedding
    from services.chat import ChatEngine

    print(f"API Key configured: {bool(settings.ANTHROPIC_API_KEY)}", flush=True)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(
            select(Wedding)
            .options(
                selectinload(Wedding.accommodations),
                selectinload(Wedding.events),
                selectinload(Wedding.faqs)
            )
            .where(Wedding.access_code == 'alice-bob-test')
        )
        wedding = result.scalar_one_or_none()

        if not wedding:
            print("Wedding not found!", flush=True)
            return

        print(f"Found wedding: {wedding.partner1_name} & {wedding.partner2_name}", flush=True)
        print(f"Dress code: {wedding.dress_code}", flush=True)
        print(f"Accommodations: {len(wedding.accommodations)}", flush=True)

        chat_engine = ChatEngine()
        print("ChatEngine created, calling API...", flush=True)

        try:
            response = await chat_engine.chat(
                wedding=wedding,
                message="What is the dress code?",
                conversation_history=[]
            )
            print(f"SUCCESS! Response: {response}", flush=True)
        except Exception as e:
            print(f"ERROR: {type(e).__name__}: {e}", flush=True)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
