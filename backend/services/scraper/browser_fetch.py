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

            # For travel pages, wait for all hotels to load
            url_lower = url.lower()
            if any(kw in url_lower for kw in ['/travel', '/accommodations', '/hotels']):
                logger.info("Travel page detected - waiting for all hotels to load")
                try:
                    # Wait for network to be mostly idle (React hydration complete)
                    await page.wait_for_load_state("networkidle", timeout=10000)
                    logger.info("Network idle, checking for hotels")

                    # Count addresses as proxy for hotel count (look for ZIP codes)
                    address_count = await page.evaluate("""
                        () => {
                            const text = document.body.innerText;
                            // Match US ZIP codes (5 digits, optionally with -4 extension)
                            const zipMatches = text.match(/\\b\\d{5}(-\\d{4})?\\b/g);
                            // Filter to likely addresses (near state abbreviations or "USA")
                            const addressMatches = text.match(/[A-Z]{2},?\\s*\\d{5}/g);
                            return addressMatches ? addressMatches.length : 0;
                        }
                    """)
                    logger.info(f"Found {address_count} addresses (hotels)")

                    # If only 1 address found, wait a bit more and scroll
                    if address_count < 2:
                        logger.info("Less than 2 hotels, waiting longer...")
                        await asyncio.sleep(2)

                    # Progressive scroll to ensure all content loaded
                    for scroll_pct in [50, 100]:
                        await page.evaluate(f"window.scrollTo(0, document.body.scrollHeight * {scroll_pct / 100})")
                        await asyncio.sleep(0.5)

                    # Scroll back to top to capture everything
                    await page.evaluate("window.scrollTo(0, 0)")
                    await asyncio.sleep(0.3)

                    # Final check
                    final_address_count = await page.evaluate("""
                        () => {
                            const text = document.body.innerText;
                            const addressMatches = text.match(/[A-Z]{2},?\\s*\\d{5}/g);
                            return addressMatches ? addressMatches.length : 0;
                        }
                    """)
                    logger.info(f"Travel page complete - {final_address_count} addresses found")

                except Exception as e:
                    logger.warning(f"Travel page wait error: {e}")
            else:
                # Quick scroll for non-travel pages
                try:
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await asyncio.sleep(0.3)
                except Exception:
                    pass

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
