"""Health check endpoint."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Check if the API is running."""
    return {"status": "healthy", "service": "wedding-chat-tool"}


@router.get("/health/playwright")
async def check_playwright():
    """Check if Playwright is installed and working."""
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            await browser.close()
        return {"playwright": "ok", "browser": "chromium"}
    except Exception as e:
        return {"playwright": "error", "detail": str(e)}
