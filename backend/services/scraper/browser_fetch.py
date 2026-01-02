"""Playwright-based browser fetching with stealth anti-detection."""
import asyncio
import random
import logging
from typing import Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from playwright_stealth import Stealth

logger = logging.getLogger(__name__)


class PlaywrightNotAvailableError(Exception):
    """Raised when Playwright browsers are not installed."""
    pass


class StealthBrowser:
    """Playwright browser with anti-detection stealth techniques."""

    def __init__(self):
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._stealth = Stealth(
            navigator_webdriver=True,
            navigator_plugins=True,
            navigator_languages=True,
            navigator_vendor=True,
            webgl_vendor=True,
            chrome_runtime=True,
        )

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def start(self):
        """Start the browser with stealth configuration."""
        if self._browser is not None:
            return

        logger.info("Starting stealth browser...")

        try:
            self._playwright = await async_playwright().start()

            # Randomize viewport for anti-detection
            viewport_width = random.randint(1200, 1920)
            viewport_height = random.randint(800, 1080)

            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-infobars",
                    "--window-position=0,0",
                    f"--window-size={viewport_width},{viewport_height}",
                ]
            )

            self._context = await self._browser.new_context(
                viewport={"width": viewport_width, "height": viewport_height},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                locale="en-US",
                timezone_id="America/New_York",
                java_script_enabled=True,
                ignore_https_errors=True,
            )

            # Apply stealth to the context
            await self._stealth.apply_stealth_async(self._context)

            logger.info(f"Stealth browser started with viewport {viewport_width}x{viewport_height}")

        except Exception as e:
            error_msg = str(e)
            if "Executable doesn't exist" in error_msg or "playwright install" in error_msg.lower():
                logger.warning("Playwright browser not installed - browser-based scraping disabled")
                self._browser = None
                self._playwright = None
                raise PlaywrightNotAvailableError("Browser not available on this server")
            raise

    async def close(self):
        """Close the browser and cleanup."""
        if self._context:
            await self._context.close()
            self._context = None
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
        logger.info("Stealth browser closed")

    async def fetch_page(self, url: str, wait_time: float = 3.0) -> Optional[str]:
        """
        Fetch a page using the stealth browser.

        Args:
            url: The URL to fetch
            wait_time: Time to wait after page load for JS rendering

        Returns:
            HTML content or None if failed
        """
        if self._context is None:
            await self.start()

        page: Optional[Page] = None
        try:
            page = await self._context.new_page()

            # Additional anti-detection JavaScript (belt and suspenders)
            await page.add_init_script("""
                // Mask webdriver property
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });

                // Add fake plugins
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        {name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer'},
                        {name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai'},
                        {name: 'Native Client', filename: 'internal-nacl-plugin'}
                    ]
                });

                // Set realistic languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en']
                });

                // Hide automation indicators
                window.chrome = { runtime: {} };
            """)

            logger.info(f"Fetching with stealth browser: {url}")

            # Navigate with timeout - use domcontentloaded since some sites have long-running requests
            response = await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=45000
            )

            if response is None:
                logger.warning(f"No response from {url}")
                return None

            status = response.status
            logger.info(f"Browser fetch status: {status}")

            # Wait for dynamic content to load
            await asyncio.sleep(wait_time)

            # Try to wait for body to have content
            try:
                await page.wait_for_selector("body", timeout=5000)
            except Exception:
                pass  # Continue even if selector wait fails

            # Try to close any popups/modals that might overlay content
            try:
                # Common close button selectors
                close_selectors = [
                    '[aria-label="Close"]',
                    '[aria-label="close"]',
                    'button[class*="close"]',
                    'button[class*="Close"]',
                    '[class*="modal"] button',
                    '[class*="popup"] button',
                    '[class*="overlay"] button',
                    'button:has-text("Close")',
                    'button:has-text("×")',
                    'button:has-text("X")',
                ]
                for selector in close_selectors:
                    try:
                        close_btn = await page.query_selector(selector)
                        if close_btn and await close_btn.is_visible():
                            logger.info(f"Closing popup with selector: {selector}")
                            await close_btn.click()
                            await asyncio.sleep(0.5)
                            break
                    except Exception:
                        continue
            except Exception as e:
                logger.debug(f"No popups to close: {e}")

            # For travel pages, wait for hotel/accommodation content to appear
            url_lower = url.lower()
            if any(kw in url_lower for kw in ['/travel', '/accommodations', '/hotels']):
                logger.info("Travel page detected - waiting for hotel content to load")

                # Click on the main content area to dismiss any overlays
                try:
                    main_content = await page.query_selector('main, [role="main"], article, .content')
                    if main_content:
                        await main_content.click()
                        await asyncio.sleep(0.5)
                except Exception:
                    pass

                # Try to wait for content that looks like hotel info
                hotel_selectors = [
                    'text=/hotel/i',
                    'text=/check-in/i',
                    'text=/booking/i',
                    'text=/room/i',
                    '[class*="hotel"]',
                    '[class*="accommodation"]',
                    '[class*="travel"]',
                ]
                for selector in hotel_selectors:
                    try:
                        await page.wait_for_selector(selector, timeout=3000)
                        logger.info(f"Found hotel content with selector: {selector}")
                        break
                    except Exception:
                        continue
                # Extra wait after content appears for full render
                await asyncio.sleep(2)

            # Scroll to trigger lazy loading
            try:
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
                await asyncio.sleep(0.5)
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(0.5)
                await page.evaluate("window.scrollTo(0, 0)")
                await asyncio.sleep(0.5)
            except Exception:
                pass  # Continue even if scroll fails

            # Get the fully rendered HTML
            html = await page.content()

            logger.info(f"Browser fetch successful: {len(html)} chars")
            return html

        except Exception as e:
            logger.error(f"Browser fetch error for {url}: {e}")
            return None
        finally:
            if page:
                await page.close()


# Convenience function for one-off fetches
async def fetch_with_browser(url: str) -> Optional[str]:
    """
    Fetch a single URL using a stealth browser.

    This creates a new browser instance, fetches the page, and closes.
    For multiple fetches, use StealthBrowser directly to reuse the browser.
    """
    async with StealthBrowser() as browser:
        return await browser.fetch_page(url)


# Test function
async def _test():
    """Test the stealth browser with The Knot."""
    url = "https://www.theknot.com/us/hannah-nichols-and-parker-howell-nov-2017"
    print(f"Testing stealth browser with: {url}")

    html = await fetch_with_browser(url)
    if html:
        print(f"Success! Got {len(html)} chars")
        print(f"First 500 chars: {html[:500]}")
        # Check if we got real content vs blocked
        if "Access Denied" in html:
            print("WARNING: Still getting Access Denied")
        elif "hannah" in html.lower() or "parker" in html.lower():
            print("SUCCESS: Found couple names in content!")
    else:
        print("Failed to fetch page")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_test())
