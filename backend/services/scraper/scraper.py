"""Wedding website scraper for popular platforms."""
import re
import json
import logging
import asyncio
from typing import Dict, Any, Optional, List
from urllib.parse import urlparse, urljoin
from datetime import datetime
import httpx
from bs4 import BeautifulSoup

from .browser_fetch import StealthBrowser, PlaywrightNotAvailableError

# Set up logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class WeddingScraper:
    """Scraper for wedding websites like The Knot, Zola, etc."""

    SUPPORTED_PLATFORMS = {
        "theknot.com": "the_knot",
        "zola.com": "zola",
        "withjoy.com": "joy",
        "minted.com": "minted",
        "weddingwire.com": "weddingwire",
        "weddingwire.us": "weddingwire",  # US domain variant
    }

    # Platforms known to require browser-based fetching due to bot protection
    BROWSER_REQUIRED_PLATFORMS = {
        "theknot.com": True,      # Akamai protection
        "weddingwire.com": True,  # Same owner as The Knot
        "weddingwire.us": True,   # US domain variant
    }

    def __init__(self):
        """Initialize the scraper with an HTTP client and optional browser."""
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Cache-Control": "max-age=0",
                "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
                "Connection": "keep-alive",
            }
        )
        self._browser: Optional[StealthBrowser] = None
        self._use_browser_for_session = False  # Track if we needed browser for main page

    async def close(self):
        """Close the HTTP client and browser if open."""
        await self.client.aclose()
        if self._browser:
            await self._browser.close()
            self._browser = None

    def _should_use_browser(self, url: str) -> bool:
        """Check if URL requires browser-based fetching."""
        parsed = urlparse(url)
        domain = parsed.netloc.lower().replace("www.", "")
        for platform_domain, required in self.BROWSER_REQUIRED_PLATFORMS.items():
            if platform_domain in domain and required:
                return True
        return False

    def _is_blocked_response(self, html: str) -> bool:
        """Check if the response indicates we were blocked."""
        if not html or len(html) < 500:
            return True
        blocked_indicators = [
            "Access Denied",
            "Please enable JavaScript",
            "Checking your browser",
            "Just a moment...",
            "Enable JavaScript and cookies",
            "Reference&#32;&#35;",  # Akamai error reference
        ]
        for indicator in blocked_indicators:
            if indicator in html:
                logger.info(f"Blocked response detected: found '{indicator}'")
                return True
        return False

    def detect_platform(self, url: str) -> Optional[str]:
        """Detect which wedding platform the URL belongs to."""
        parsed = urlparse(url)
        domain = parsed.netloc.lower().replace("www.", "")

        for platform_domain, platform_name in self.SUPPORTED_PLATFORMS.items():
            if platform_domain in domain:
                return platform_name

        return None

    async def _fetch_with_httpx(self, url: str) -> Optional[str]:
        """Fetch a page using httpx (fast, but may get blocked)."""
        try:
            logger.info(f"Fetching with httpx: {url}")
            response = await self.client.get(url)
            response.raise_for_status()
            return response.text
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error {e.response.status_code} for {url}")
            if e.response.status_code == 403 and e.response.text:
                return e.response.text
            return None
        except httpx.HTTPError as e:
            logger.warning(f"HTTP error fetching {url}: {e}")
            return None

    async def _fetch_with_browser(self, url: str, wait_time: float = 3.0) -> Optional[str]:
        """Fetch a page using the stealth browser (slower, but bypasses bot protection)."""
        try:
            if self._browser is None:
                self._browser = StealthBrowser()
                await self._browser.start()
            return await self._browser.fetch_page(url, wait_time=wait_time)
        except PlaywrightNotAvailableError:
            logger.warning("Playwright not available - cannot use browser-based scraping")
            return None

    async def _fetch_page(self, url: str, wait_time: float = 3.0) -> Optional[str]:
        """Fetch a single page with tiered fallback strategy.

        Tier 1: httpx (fast, free)
        Tier 2: Playwright stealth browser (slower, bypasses bot protection)

        Args:
            url: The URL to fetch
            wait_time: Time to wait for JS rendering (browser only)

        Returns:
            HTML content or None if fetch failed
        """
        # If we already know we need browser for this session, skip httpx
        if self._use_browser_for_session or self._should_use_browser(url):
            logger.info(f"Using browser for {url} (known to require it)")
            html = await self._fetch_with_browser(url, wait_time=wait_time)
            if html and not self._is_blocked_response(html):
                self._use_browser_for_session = True
                return html
            return None

        # Tier 1: Try httpx first
        html = await self._fetch_with_httpx(url)
        if html and not self._is_blocked_response(html):
            return html

        # Tier 2: Fall back to browser
        logger.info(f"httpx blocked, trying browser for {url}")
        html = await self._fetch_with_browser(url, wait_time=wait_time)
        if html and not self._is_blocked_response(html):
            self._use_browser_for_session = True  # Use browser for remaining requests
            return html

        return None

    def _find_nav_subpages(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Find navigation links from nav/header elements with their display names.

        Returns a list of dicts with 'url' and 'name' keys, where 'name' is the
        nav link text (e.g., "Travel", "Q&A", "Registry").

        This approach:
        1. Finds ALL pages the site actually has (not just keyword matches)
        2. Associates content with the correct page type based on nav text
        3. Prevents cross-contamination between page types
        """
        nav_links = []
        seen_urls = set()
        parsed_base = urlparse(base_url)
        base_path = parsed_base.path.rstrip("/")

        # Look for navigation elements
        nav_elements = soup.find_all(['nav', 'header'])

        # Also look for common nav class patterns
        nav_class_patterns = [
            '[class*="nav"]', '[class*="Nav"]', '[class*="menu"]', '[class*="Menu"]',
            '[role="navigation"]', '[class*="header"]', '[class*="Header"]'
        ]
        for pattern in nav_class_patterns:
            try:
                for elem in soup.select(pattern):
                    if elem not in nav_elements:
                        nav_elements.append(elem)
            except Exception:
                pass

        logger.info(f"Found {len(nav_elements)} navigation elements to scan")

        for nav in nav_elements:
            for link in nav.find_all('a', href=True):
                href = link['href']
                link_text = link.get_text(strip=True)

                # Skip empty links, anchors, external links
                if not link_text or len(link_text) > 50:  # Nav links are typically short
                    continue
                if href.startswith('#') or href.startswith('javascript:') or href.startswith('mailto:'):
                    continue

                # Make absolute URL
                if href.startswith('/'):
                    full_url = f"{parsed_base.scheme}://{parsed_base.netloc}{href}"
                elif not href.startswith('http'):
                    full_url = urljoin(base_url, href)
                else:
                    full_url = href

                # Skip external links
                parsed_href = urlparse(full_url)
                if parsed_href.netloc != parsed_base.netloc:
                    continue

                # Skip if it's the home page
                href_path = parsed_href.path.rstrip('/')
                if href_path == base_path or href_path == '':
                    continue

                # Skip if already seen
                if full_url in seen_urls:
                    continue

                # Check if it's a subpage of the wedding site
                if href_path.startswith(base_path) or base_path in href_path:
                    seen_urls.add(full_url)
                    # Clean up the link text (nav link name)
                    clean_name = link_text.strip().lower()
                    nav_links.append({
                        'url': full_url,
                        'name': clean_name,
                        'display_name': link_text.strip()
                    })
                    logger.info(f"Found nav link: '{link_text}' -> {full_url}")

        # Deduplicate by URL, keeping first occurrence
        unique_links = []
        final_urls = set()
        for link in nav_links:
            if link['url'] not in final_urls:
                final_urls.add(link['url'])
                unique_links.append(link)

        logger.info(f"Nav-based discovery found {len(unique_links)} subpages")
        return unique_links[:10]  # Limit to 10 sub-pages

    def _find_subpages(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """Find navigation links to sub-pages on wedding websites.

        This is now a wrapper that returns just URLs for backward compatibility.
        Use _find_nav_subpages() for the full nav link info.
        """
        nav_links = self._find_nav_subpages(soup, base_url)
        if nav_links:
            return [link['url'] for link in nav_links]

        # Fallback to keyword-based discovery if nav detection fails
        logger.info("Nav-based discovery found no links, falling back to keyword matching")
        return self._find_subpages_by_keywords(soup, base_url)

    def _find_subpages_by_keywords(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """Fallback: Find subpages using keyword matching (legacy approach)."""
        subpages = []
        parsed_base = urlparse(base_url)
        base_path = parsed_base.path.rstrip("/")

        # Common sub-page names on wedding websites
        subpage_keywords = ["q-a", "qa", "faq", "travel", "things-to-do", "registry",
                          "rsvp", "schedule", "story", "photos", "party", "details",
                          "accommodations", "hotels", "wedding-party", "our-story",
                          "events", "ceremony", "reception", "welcome"]

        for link in soup.find_all("a", href=True):
            href = link["href"]

            # Skip external links, anchors, and javascript
            if href.startswith("#") or href.startswith("javascript:") or href.startswith("mailto:"):
                continue

            # Make absolute URL
            if href.startswith("/"):
                full_url = f"{parsed_base.scheme}://{parsed_base.netloc}{href}"
            elif not href.startswith("http"):
                full_url = urljoin(base_url, href)
            else:
                full_url = href

            # Check if it's a sub-page of the wedding site
            parsed_href = urlparse(full_url)
            if parsed_href.netloc != parsed_base.netloc:
                continue

            # Check if it looks like a wedding sub-page
            href_path = parsed_href.path.lower()
            if href_path.startswith(base_path) and href_path != base_path:
                # It's a sub-page
                if full_url not in subpages and full_url != base_url:
                    subpages.append(full_url)
            else:
                # Check if it contains sub-page keywords
                for keyword in subpage_keywords:
                    if keyword in href_path:
                        if full_url not in subpages:
                            subpages.append(full_url)
                        break

        return subpages[:10]  # Limit to 10 sub-pages to avoid excessive scraping

    def _get_known_subpages(self, url: str, platform: str) -> List[str]:
        """Generate URLs for known subpages based on platform patterns.

        This is a fallback when _find_subpages() can't detect navigation
        (e.g., when navigation is rendered by JavaScript).
        """
        base_url = url.rstrip("/")

        if platform == "the_knot":
            # The Knot pattern: /us/couple-name/section
            sections = ["travel", "q-a", "schedule", "registry", "rsvp", "party", "photos"]
            return [f"{base_url}/{section}" for section in sections]
        elif platform == "zola":
            sections = ["travel", "faq", "schedule", "registry"]
            return [f"{base_url}/{section}" for section in sections]
        elif platform == "joy":
            sections = ["travel", "faq", "schedule", "registry", "story"]
            return [f"{base_url}/{section}" for section in sections]
        elif platform == "weddingwire":
            sections = ["events", "travel", "accommodations", "q-a", "schedule", "registry"]
            return [f"{base_url}/{section}" for section in sections]

        return []

    async def scrape(self, url: str) -> Dict[str, Any]:
        """
        Scrape wedding information from a URL and its sub-pages.

        Args:
            url: The wedding website URL

        Returns:
            Dictionary with scraped wedding data
        """
        platform = self.detect_platform(url)

        # Fetch main page
        logger.info(f"Scraping {url} (platform: {platform})")
        html = await self._fetch_page(url)
        if not html:
            # Check if this is a bot-protected site
            if platform in ["the_knot", "weddingwire"]:
                return {
                    "error": "This website has bot protection that requires a browser. Please try a different wedding website platform (Zola, Joy, or Minted work well), or enter your wedding details manually.",
                    "url": url,
                    "platform": platform
                }
            return {
                "error": "Failed to fetch wedding website. The site may be unavailable or blocking our request.",
                "url": url
            }

        try:
            soup = BeautifulSoup(html, "html.parser")

            # Try to get JSON-LD structured data first (works on many platforms)
            json_ld_data = self._extract_json_ld(soup)

            # Find subpages using nav-based discovery (preferred) or keyword fallback
            nav_links = self._find_nav_subpages(soup, url)

            # Fallback: If no nav links found, try keyword-based discovery
            if not nav_links:
                logger.info("Nav-based discovery found no links, trying keyword fallback")
                keyword_urls = self._find_subpages_by_keywords(soup, url)
                # Convert to nav_links format with URL-derived names
                nav_links = [
                    {'url': u, 'name': urlparse(u).path.split('/')[-1] or 'subpage', 'display_name': urlparse(u).path.split('/')[-1] or 'Subpage'}
                    for u in keyword_urls
                ]

            # Second fallback: Use known platform URL patterns
            if not nav_links and platform:
                logger.info(f"No subpages detected in HTML, using known patterns for {platform}")
                known_urls = self._get_known_subpages(url, platform)
                nav_links = [
                    {'url': u, 'name': urlparse(u).path.split('/')[-1] or 'subpage', 'display_name': urlparse(u).path.split('/')[-1] or 'Subpage'}
                    for u in known_urls
                ]

            # Pages to skip scraping - chatbot will redirect users to view these directly
            # We still track that they exist so Claude can reference them
            skip_keywords = ["photos", "photo", "gallery", "registry", "gift", "gifts"]

            # Separate into pages to scrape vs pages to just note existence
            pages_to_scrape = []
            pages_available = []  # Pages that exist but we won't scrape

            for link in nav_links:
                page_name_lower = link['name'].lower()
                if any(skip in page_name_lower for skip in skip_keywords):
                    # Track that this page exists (for Claude to reference)
                    pages_available.append({
                        'name': link['display_name'],
                        'url': link['url'],
                        'type': 'photos' if any(p in page_name_lower for p in ['photo', 'gallery']) else 'registry'
                    })
                    logger.info(f"Skipping (will redirect): '{link['display_name']}' -> {link['url']}")
                else:
                    pages_to_scrape.append(link)

            nav_links = pages_to_scrape
            logger.info(f"Will scrape {len(nav_links)} subpages: {[l['name'] for l in nav_links]}")
            if pages_available:
                logger.info(f"Available but not scraped: {[p['name'] for p in pages_available]}")

            subpage_content = {}

            # Pages that need extra wait time for JS to render hotel/accommodation info
            slow_render_keywords = ["travel", "accommodations", "hotels", "stay", "lodging"]

            # Use sequential fetching with the existing browser to avoid rate limiting
            # Parallel browsers were causing all subpages to timeout
            logger.info(f"Fetching {len(nav_links)} subpages sequentially")

            for link in nav_links:
                subpage_url = link['url']
                nav_name = link['name']  # Use nav link text as the page identifier
                display_name = link['display_name']

                needs_extra_wait = any(slow in nav_name.lower() for slow in slow_render_keywords)
                wait_time = 3.0 if needs_extra_wait else 2.0

                logger.info(f"Fetching subpage: '{display_name}' ({subpage_url}) (wait={wait_time}s)")

                try:
                    subpage_html = await self._fetch_page(subpage_url, wait_time=wait_time)
                    if subpage_html:
                        subpage_soup = BeautifulSoup(subpage_html, "html.parser")
                        content = self._extract_main_content(subpage_soup, nav_name)
                        logger.info(f"Successfully scraped subpage: '{display_name}' ({len(content)} chars)")
                        # Use nav link name as key for better content disaggregation
                        subpage_content[nav_name] = content
                    else:
                        logger.warning(f"Failed to fetch subpage: '{display_name}'")
                except Exception as e:
                    logger.error(f"Error fetching subpage '{display_name}': {e}")

            # Diagnostic logging for subpage content
            logger.info(f"Subpage content keys: {list(subpage_content.keys())}")
            for k, v in subpage_content.items():
                preview = v[:150].replace('\n', ' ')
                logger.info(f"Subpage '{k}' preview: {preview}...")

            if platform == "the_knot":
                return await self._scrape_the_knot(soup, url, json_ld_data, subpage_content, pages_available)
            elif platform == "zola":
                return await self._scrape_zola(soup, url, json_ld_data, subpage_content, pages_available)
            elif platform == "joy":
                return await self._scrape_joy(soup, url, json_ld_data, subpage_content, pages_available)
            elif platform == "weddingwire":
                return await self._scrape_weddingwire(soup, url, json_ld_data, subpage_content, pages_available)
            else:
                # Generic scraping for unknown platforms
                return await self._scrape_generic(soup, url, json_ld_data, subpage_content, pages_available)

        except Exception as e:
            return {
                "error": f"Failed to parse wedding website: {str(e)}",
                "url": url
            }

    def _extract_json_ld(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract JSON-LD structured data from the page."""
        json_ld_data = {}
        scripts = soup.find_all("script", type="application/ld+json")

        for script in scripts:
            try:
                if script.string:
                    data = json.loads(script.string)
                    # Handle both single objects and arrays
                    if isinstance(data, list):
                        for item in data:
                            if isinstance(item, dict):
                                json_ld_data.update(item)
                    elif isinstance(data, dict):
                        json_ld_data.update(data)
            except json.JSONDecodeError:
                continue

        return json_ld_data

    def _extract_couple_from_url(self, url: str) -> Optional[str]:
        """Try to extract couple names from URL path."""
        parsed = urlparse(url)
        path = parsed.path.lower()

        # Common patterns: /us/jane-and-john, /wedding/jane-john, etc.
        patterns = [
            r"/us/([a-z]+)-and-([a-z]+)",
            r"/wedding/([a-z]+)-([a-z]+)",
            r"/([a-z]+)-and-([a-z]+)",
            r"/([a-z]+)-([a-z]+)-wedding",
        ]

        for pattern in patterns:
            match = re.search(pattern, path)
            if match:
                name1 = match.group(1).title()
                name2 = match.group(2).title()
                return f"{name1} & {name2}"

        return None

    def _clean_page_text(self, text: str) -> str:
        """Remove garbage from scraped text (icons, cookie policy, etc.)."""
        lines = text.split('\n')
        cleaned = []
        for line in lines:
            line = line.strip()
            if not line or len(line) < 3:
                continue
            # Skip icon names (single underscore-separated lowercase words)
            if re.match(r'^[a-z_]+$', line) and len(line) < 30:
                continue
            # Skip cookie policy boilerplate
            if 'cookie' in line.lower() and len(line) > 100:
                continue
            if 'privacy' in line.lower() and 'choices' in line.lower():
                continue
            # Skip single numbers or very short strings
            if re.match(r'^[\d\s]+$', line):
                continue
            # Skip registry/shop-related content that pollutes travel pages
            registry_indicators = ['needs 1 of', 'shop registry', 'gift providers',
                                   'our wish list', 'filter/sort', 'price low to high',
                                   'price high to low', 'cash fund', 'honeymoon fund',
                                   'gift any amount', 'purchased', 'add to cart',
                                   'target™', 'threshold™', 'brightroom™', 'amazon.com']
            if any(indicator in line.lower() for indicator in registry_indicators):
                continue
            # Skip lines that look like product listings (price patterns)
            if re.match(r'^\$[\d,]+\.?\d*$', line):
                continue
            cleaned.append(line)
        return '\n'.join(cleaned)

    def _extract_main_content(self, soup: BeautifulSoup, page_name: str) -> str:
        """Extract main content from a page, excluding sidebars and widgets.

        This is especially important for The Knot which has persistent registry
        sidebars that pollute the content extraction.
        """
        # Make a copy of soup to avoid modifying the original
        from copy import copy
        soup_copy = BeautifulSoup(str(soup), 'html.parser')

        # Remove known non-content elements (registry sidebars, footers, etc.)
        selectors_to_remove = [
            '[data-testid*="registry"]',  # Registry widgets
            '[class*="registry"]',
            '[class*="Registry"]',
            '[class*="sidebar"]',
            '[class*="Sidebar"]',
            '[class*="gift-list"]',
            '[class*="GiftList"]',
            '[class*="wishlist"]',
            '[class*="WishList"]',
            'aside',  # Sidebars
            '[role="complementary"]',  # Accessibility sidebars
            'footer',
            '[class*="footer"]',
            '[class*="Footer"]',
            '[class*="cookie"]',
            '[class*="Cookie"]',
            '[class*="consent"]',
            '[class*="Consent"]',
            '[class*="modal"]',
            '[class*="Modal"]',
            '[class*="popup"]',
            '[class*="Popup"]',
        ]

        for selector in selectors_to_remove:
            try:
                for elem in soup_copy.select(selector):
                    elem.decompose()
            except Exception:
                pass  # Some selectors might not match

        # For travel/accommodation pages, look for specific content areas
        travel_keywords = ['travel', 'hotel', 'accommod', 'stay', 'lodging', 'where to stay',
                          'room block', 'book your room', 'reserv', 'check-in', 'check-out',
                          'courtyard', 'marriott', 'hilton', 'hyatt', 'inn', 'suites']
        if any(kw in page_name.lower() for kw in ['travel', 'accommodations', 'hotels']):
            # Collect ALL hotel sections, not just the best one
            hotel_sections = []
            seen_texts = set()  # Avoid duplicates

            # Look for sections with travel-related content
            for section in soup_copy.find_all(['main', 'article', 'section', 'div']):
                section_text = section.get_text(strip=True)
                section_text_lower = section_text.lower()
                section_class = ' '.join(section.get('class', [])).lower()
                section_id = (section.get('id') or '').lower()

                # Skip sections that look like registry/product listings
                if any(x in section_text_lower for x in ['needs 1 of', 'add to cart', 'shop registry', 'our wish list']):
                    continue

                # Skip very short or very long sections (likely nav or containers)
                if len(section_text) < 100 or len(section_text) > 10000:
                    continue

                # Score this section based on hotel-related content
                score = 0

                # Check for travel keywords (search more of the text)
                for kw in travel_keywords:
                    if kw in section_text_lower[:2000]:
                        score += 1

                # Bonus points for phone number pattern (hotels have phone numbers)
                if re.search(r'\(\d{3}\)\s*\d{3}[-.]?\d{4}', section_text):
                    score += 5

                # Bonus for address-like pattern (street addresses)
                if re.search(r'\d+\s+\w+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane)', section_text_lower):
                    score += 5

                # Bonus for check-in/check-out dates
                if 'check-in' in section_text_lower and 'check-out' in section_text_lower:
                    score += 10

                # Is it a travel section by class/id?
                if any(kw in section_class or kw in section_id for kw in ['travel', 'hotel', 'accommod']):
                    score += 3

                # Collect sections with decent hotel-related scores
                if score >= 8 and len(section_text) > 100:
                    # Create a text fingerprint to avoid duplicates
                    fingerprint = section_text[:100]
                    if fingerprint not in seen_texts:
                        seen_texts.add(fingerprint)
                        content = section.get_text(separator="\n", strip=True)
                        hotel_sections.append((score, content))
                        logger.info(f"Found hotel section: score={score}, length={len(content)}")

            if hotel_sections:
                # Sort by score descending and combine all
                hotel_sections.sort(key=lambda x: x[0], reverse=True)
                combined = "\n\n".join([content for score, content in hotel_sections])
                logger.info(f"Combined {len(hotel_sections)} hotel sections, total {len(combined)} chars")
                return self._clean_page_text(combined)[:8000]  # Increased limit for multiple hotels

        # For Q&A/FAQ pages, look for question/answer content
        if any(kw in page_name.lower() for kw in ['q-a', 'qa', 'faq']):
            qa_content = []
            # Look for FAQ-style elements
            for elem in soup_copy.find_all(['details', 'summary', 'dt', 'dd']):
                qa_content.append(elem.get_text(strip=True))

            # Also look for elements with FAQ-like classes
            for selector in ['[class*="faq"]', '[class*="Faq"]', '[class*="question"]',
                           '[class*="Question"]', '[class*="answer"]', '[class*="Answer"]']:
                try:
                    for elem in soup_copy.select(selector):
                        text = elem.get_text(separator="\n", strip=True)
                        if text and text not in qa_content:
                            qa_content.append(text)
                except Exception:
                    pass

            if qa_content:
                return self._clean_page_text('\n'.join(qa_content))[:5000]

        # Default: try to find the main content area
        main_elem = soup_copy.find('main') or soup_copy.find('[role="main"]')
        if main_elem:
            return self._clean_page_text(main_elem.get_text(separator="\n", strip=True))[:5000]

        # Fallback: get all text but clean it aggressively
        return self._clean_page_text(soup_copy.get_text(separator="\n", strip=True))[:5000]

    async def _scrape_the_knot(self, soup: BeautifulSoup, url: str, json_ld: Dict, subpage_content: Dict[str, str] = None, pages_available: List[Dict] = None) -> Dict[str, Any]:
        """Scrape The Knot wedding website with enhanced extraction."""
        subpage_content = subpage_content or {}
        pages_available = pages_available or []
        data = {
            "platform": "the_knot",
            "url": url,
            "scraped_at": datetime.utcnow().isoformat(),
            "pages_scraped": ["home"] + list(subpage_content.keys()),
            "pages_available": pages_available  # Photos/registry pages to redirect to
        }

        # Try to extract couple names from URL first (most reliable for The Knot)
        url_names = self._extract_couple_from_url(url)
        if url_names:
            data["couple_names"] = url_names

        # Look for couple names in h1 or title
        if not data.get("couple_names"):
            h1 = soup.find("h1")
            if h1:
                data["couple_names"] = h1.get_text(strip=True)

        # Extract from title as fallback
        title = soup.find("title")
        if title:
            data["page_title"] = title.get_text(strip=True)
            if not data.get("couple_names"):
                # Parse from title like "Jane & John's Wedding Website"
                title_text = title.get_text(strip=True)
                match = re.search(r"^([^']+)'s", title_text)
                if match:
                    data["couple_names"] = match.group(1)

        # Look for wedding date - try multiple approaches
        # 1. Look for specific date elements
        date_elem = soup.find(attrs={"data-testid": re.compile(r"date", re.I)})
        if date_elem:
            data["wedding_date_text"] = date_elem.get_text(strip=True)
        else:
            # 2. Look for date patterns in text
            date_pattern = re.compile(r"(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}/\d{1,2}/\d{4})")
            for elem in soup.find_all(["p", "div", "span", "h2", "h3"]):
                text = elem.get_text(strip=True)
                match = date_pattern.search(text)
                if match and len(text) < 100:  # Avoid grabbing from long paragraphs
                    data["wedding_date_text"] = match.group(1)
                    break

        # Look for venue/location sections
        venue_keywords = ["venue", "location", "ceremony", "reception", "where", "place"]
        for section in soup.find_all(["section", "div", "article"]):
            section_class = " ".join(section.get("class", []))
            section_id = section.get("id", "")
            section_text = section.get_text(strip=True).lower()[:200]

            if any(kw in section_class.lower() or kw in section_id.lower() or kw in section_text for kw in venue_keywords):
                if not data.get("venue_info"):
                    data["venue_info"] = section.get_text(separator="\n", strip=True)[:2000]

        # Look for registry links
        registry_links = []
        registry_stores = ["amazon", "target", "crate", "williams-sonoma", "registry", "bloomingdale",
                          "bed bath", "pottery barn", "macy", "zola", "honeyfund"]
        for link in soup.find_all("a", href=True):
            href = link["href"].lower()
            link_text = link.get_text(strip=True).lower()
            if any(store in href or store in link_text for store in registry_stores):
                registry_links.append({
                    "text": link.get_text(strip=True),
                    "url": link["href"]
                })
        if registry_links:
            data["registry_links"] = registry_links

        # Look for travel/hotel info
        travel_keywords = ["travel", "hotel", "accommod", "stay", "lodging", "where to stay"]
        for section in soup.find_all(["section", "div", "article"]):
            section_class = " ".join(section.get("class", []))
            section_id = section.get("id", "")
            section_text = section.get_text(strip=True).lower()[:200]

            if any(kw in section_class.lower() or kw in section_id.lower() or kw in section_text for kw in travel_keywords):
                if not data.get("travel_info"):
                    data["travel_info"] = section.get_text(separator="\n", strip=True)[:3000]

        # Look for schedule/events
        schedule_keywords = ["schedule", "event", "itinerary", "timeline", "weekend", "activities"]
        for section in soup.find_all(["section", "div", "article"]):
            section_class = " ".join(section.get("class", []))
            section_id = section.get("id", "")
            section_text = section.get_text(strip=True).lower()[:200]

            if any(kw in section_class.lower() or kw in section_id.lower() or kw in section_text for kw in schedule_keywords):
                if not data.get("schedule_info"):
                    data["schedule_info"] = section.get_text(separator="\n", strip=True)[:3000]

        # Look for FAQ section
        faq_keywords = ["faq", "question", "q&a", "q & a"]
        for section in soup.find_all(["section", "div", "article"]):
            section_class = " ".join(section.get("class", []))
            section_id = section.get("id", "")
            section_text = section.get_text(strip=True).lower()[:100]

            if any(kw in section_class.lower() or kw in section_id.lower() or kw in section_text for kw in faq_keywords):
                if not data.get("faq_info"):
                    data["faq_info"] = section.get_text(separator="\n", strip=True)[:3000]

        # Look for RSVP link
        rsvp_link = soup.find("a", href=re.compile(r"rsvp", re.I))
        if rsvp_link:
            href = rsvp_link["href"]
            if href.startswith("/"):
                href = urljoin(url, href)
            data["rsvp_url"] = href

        # Look for dress code
        dress_keywords = ["dress code", "attire", "what to wear", "dress"]
        for elem in soup.find_all(["p", "div", "span", "li"]):
            text = elem.get_text(strip=True).lower()
            if any(kw in text for kw in dress_keywords) and len(text) < 500:
                data["dress_code_info"] = elem.get_text(strip=True)
                break

        # Include JSON-LD if found
        if json_ld:
            data["json_ld"] = json_ld

        # Extract all text for LLM context - include subpage content
        # Clean the main page text to remove garbage (icons, cookie policy, etc.)
        raw_main_text = soup.get_text(separator="\n", strip=True)
        main_text = self._clean_page_text(raw_main_text)[:6000]  # Reduced to make room for subpages

        # Prioritize travel/hotel content by putting it FIRST
        priority_pages = ['travel', 'accommodations', 'hotels', 'q-a', 'faq']
        other_pages = [k for k in subpage_content.keys() if k not in priority_pages]

        subpage_texts = []
        # Add priority pages first
        for page_name in priority_pages:
            if page_name in subpage_content:
                cleaned_content = self._clean_page_text(subpage_content[page_name])
                subpage_texts.append(f"\n\n=== {page_name.upper()} PAGE ===\n{cleaned_content}")
        # Then add other pages
        for page_name in other_pages:
            cleaned_content = self._clean_page_text(subpage_content[page_name])
            subpage_texts.append(f"\n\n=== {page_name.upper()} PAGE ===\n{cleaned_content}")

        combined_text = main_text + "".join(subpage_texts)

        # Add note about available pages (photos/registry) that weren't scraped
        # This tells Claude to redirect users to view these on the couple's website
        if pages_available:
            available_note = "\n\n=== PAGES TO REDIRECT GUESTS TO ===\n"
            available_note += "The following pages are available on the couple's wedding website. "
            available_note += "Direct guests to visit these URLs to view this content:\n"
            for page in pages_available:
                available_note += f"- {page['name']}: {page['url']}\n"
            combined_text += available_note

        data["full_text"] = combined_text[:30000]  # Increased to ensure travel content included

        # Diagnostic logging
        logger.info(f"full_text total length: {len(data['full_text'])} chars")
        logger.info(f"Contains TRAVEL marker: {'=== TRAVEL PAGE ===' in data['full_text']}")
        if '=== TRAVEL PAGE ===' in data['full_text']:
            travel_start = data['full_text'].find('=== TRAVEL PAGE ===')
            logger.info(f"Travel content preview: {data['full_text'][travel_start:travel_start+300]}")

        return data

    async def _scrape_zola(self, soup: BeautifulSoup, url: str, json_ld: Dict, subpage_content: Dict[str, str] = None, pages_available: List[Dict] = None) -> Dict[str, Any]:
        """Scrape Zola wedding website with enhanced extraction."""
        subpage_content = subpage_content or {}
        pages_available = pages_available or []
        data = {
            "platform": "zola",
            "url": url,
            "scraped_at": datetime.utcnow().isoformat(),
            "pages_scraped": ["home"] + list(subpage_content.keys()),
            "pages_available": pages_available
        }

        # Zola uses React, so look for data in scripts
        scripts = soup.find_all("script")
        for script in scripts:
            if script.string:
                # Look for PRELOADED_STATE
                if "window.__PRELOADED_STATE__" in script.string:
                    data["has_preloaded_state"] = True
                    # Try to extract JSON
                    match = re.search(r'window\.__PRELOADED_STATE__\s*=\s*({.*?});?\s*(?:</script>|$)',
                                     script.string, re.DOTALL)
                    if match:
                        try:
                            preloaded = json.loads(match.group(1))
                            data["preloaded_state"] = preloaded
                        except json.JSONDecodeError:
                            pass

                # Look for NEXT_DATA (Zola might use Next.js)
                if "__NEXT_DATA__" in script.string:
                    try:
                        next_data = json.loads(script.string)
                        data["next_data"] = next_data
                    except json.JSONDecodeError:
                        pass

        # Extract couple names from URL
        url_names = self._extract_couple_from_url(url)
        if url_names:
            data["couple_names"] = url_names

        # Try to find couple names in page
        title = soup.find("title")
        if title:
            data["page_title"] = title.get_text(strip=True)

        h1 = soup.find("h1")
        if h1:
            h1_text = h1.get_text(strip=True)
            if not data.get("couple_names"):
                data["couple_names"] = h1_text

        # Look for date
        for elem in soup.find_all(["h2", "h3", "p", "div", "span"]):
            text = elem.get_text(strip=True)
            date_match = re.search(r"(\w+\s+\d{1,2},?\s+\d{4})", text)
            if date_match and len(text) < 100:
                data["wedding_date_text"] = date_match.group(1)
                break

        # Look for sections by content
        for section in soup.find_all(["section", "div"]):
            section_text = section.get_text(strip=True).lower()[:200]

            if ("hotel" in section_text or "accommodation" in section_text or "stay" in section_text) and not data.get("travel_info"):
                data["travel_info"] = section.get_text(separator="\n", strip=True)[:3000]

            if ("schedule" in section_text or "event" in section_text or "itinerary" in section_text) and not data.get("schedule_info"):
                data["schedule_info"] = section.get_text(separator="\n", strip=True)[:3000]

            if ("registry" in section_text or "gift" in section_text) and not data.get("registry_info"):
                data["registry_info"] = section.get_text(separator="\n", strip=True)[:2000]

        # Find registry links
        registry_links = []
        for link in soup.find_all("a", href=True):
            href = link["href"].lower()
            if "registry" in href or "gift" in href:
                registry_links.append({
                    "text": link.get_text(strip=True),
                    "url": link["href"]
                })
        if registry_links:
            data["registry_links"] = registry_links

        # Include JSON-LD if found
        if json_ld:
            data["json_ld"] = json_ld

        # Extract full text with subpage content
        main_text = soup.get_text(separator="\n", strip=True)[:8000]
        subpage_texts = []
        for page_name, content in subpage_content.items():
            subpage_texts.append(f"\n\n=== {page_name.upper()} PAGE ===\n{content}")
        combined_text = main_text + "".join(subpage_texts)

        # Add note about available pages (photos/registry) that weren't scraped
        if pages_available:
            available_note = "\n\n=== PAGES TO REDIRECT GUESTS TO ===\n"
            available_note += "The following pages are available on the couple's wedding website. "
            available_note += "Direct guests to visit these URLs to view this content:\n"
            for page in pages_available:
                available_note += f"- {page['name']}: {page['url']}\n"
            combined_text += available_note

        data["full_text"] = combined_text[:20000]

        return data

    async def _scrape_joy(self, soup: BeautifulSoup, url: str, json_ld: Dict, subpage_content: Dict[str, str] = None, pages_available: List[Dict] = None) -> Dict[str, Any]:
        """Scrape WithJoy wedding website with enhanced extraction."""
        subpage_content = subpage_content or {}
        pages_available = pages_available or []
        data = {
            "platform": "joy",
            "url": url,
            "scraped_at": datetime.utcnow().isoformat(),
            "pages_scraped": ["home"] + list(subpage_content.keys()),
            "pages_available": pages_available
        }

        # Joy uses Next.js, look for __NEXT_DATA__
        next_data_script = soup.find("script", id="__NEXT_DATA__")
        if next_data_script and next_data_script.string:
            try:
                next_data = json.loads(next_data_script.string)
                data["next_data"] = next_data

                # Try to extract props
                props = next_data.get("props", {}).get("pageProps", {})
                if props:
                    data["page_props"] = props
            except json.JSONDecodeError:
                pass

        # Extract from URL
        url_names = self._extract_couple_from_url(url)
        if url_names:
            data["couple_names"] = url_names

        # Joy sites usually have couple names in h1 or title
        h1 = soup.find("h1")
        if h1:
            h1_text = h1.get_text(strip=True)
            if not data.get("couple_names"):
                data["couple_names"] = h1_text

        title = soup.find("title")
        if title:
            data["page_title"] = title.get_text(strip=True)

        # Look for wedding date
        for elem in soup.find_all(["h2", "h3", "p", "div", "span"]):
            text = elem.get_text(strip=True)
            date_match = re.search(r"(\w+\s+\d{1,2},?\s+\d{4})", text)
            if date_match and len(text) < 100:
                data["wedding_date_text"] = date_match.group(1)
                break

        # Look for sections
        for section in soup.find_all(["section", "div", "article"]):
            section_text = section.get_text(strip=True).lower()[:200]

            if ("hotel" in section_text or "travel" in section_text) and not data.get("travel_info"):
                data["travel_info"] = section.get_text(separator="\n", strip=True)[:3000]

            if ("schedule" in section_text or "event" in section_text) and not data.get("schedule_info"):
                data["schedule_info"] = section.get_text(separator="\n", strip=True)[:3000]

            if ("faq" in section_text or "question" in section_text) and not data.get("faq_info"):
                data["faq_info"] = section.get_text(separator="\n", strip=True)[:3000]

        # Find registry links
        registry_links = []
        for link in soup.find_all("a", href=True):
            href = link["href"].lower()
            link_text = link.get_text(strip=True).lower()
            if "registry" in href or "registry" in link_text or "gift" in link_text:
                registry_links.append({
                    "text": link.get_text(strip=True),
                    "url": link["href"]
                })
        if registry_links:
            data["registry_links"] = registry_links

        # Include JSON-LD if found
        if json_ld:
            data["json_ld"] = json_ld

        # Extract full text with subpage content
        main_text = soup.get_text(separator="\n", strip=True)[:8000]
        subpage_texts = []
        for page_name, content in subpage_content.items():
            subpage_texts.append(f"\n\n=== {page_name.upper()} PAGE ===\n{content}")
        combined_text = main_text + "".join(subpage_texts)

        # Add note about available pages (photos/registry) that weren't scraped
        if pages_available:
            available_note = "\n\n=== PAGES TO REDIRECT GUESTS TO ===\n"
            available_note += "The following pages are available on the couple's wedding website. "
            available_note += "Direct guests to visit these URLs to view this content:\n"
            for page in pages_available:
                available_note += f"- {page['name']}: {page['url']}\n"
            combined_text += available_note

        data["full_text"] = combined_text[:20000]

        return data

    async def _scrape_weddingwire(self, soup: BeautifulSoup, url: str, json_ld: Dict, subpage_content: Dict[str, str] = None, pages_available: List[Dict] = None) -> Dict[str, Any]:
        """Scrape WeddingWire website (similar to The Knot)."""
        # WeddingWire has similar structure to The Knot
        data = await self._scrape_the_knot(soup, url, json_ld, subpage_content, pages_available)
        data["platform"] = "weddingwire"
        return data

    async def _scrape_generic(self, soup: BeautifulSoup, url: str, json_ld: Dict, subpage_content: Dict[str, str] = None, pages_available: List[Dict] = None) -> Dict[str, Any]:
        """Generic scraping for unknown platforms with comprehensive extraction."""
        subpage_content = subpage_content or {}
        pages_available = pages_available or []
        data = {
            "platform": "generic",
            "url": url,
            "scraped_at": datetime.utcnow().isoformat(),
            "pages_scraped": ["home"] + list(subpage_content.keys()),
            "pages_available": pages_available
        }

        # Try URL extraction
        url_names = self._extract_couple_from_url(url)
        if url_names:
            data["couple_names"] = url_names

        # Get title
        title = soup.find("title")
        if title:
            data["page_title"] = title.get_text(strip=True)

        # Get h1
        h1 = soup.find("h1")
        if h1:
            h1_text = h1.get_text(strip=True)
            data["main_heading"] = h1_text
            if not data.get("couple_names"):
                # Try to parse couple names from h1
                if "&" in h1_text or " and " in h1_text.lower():
                    data["couple_names"] = h1_text

        # Look for date patterns
        date_pattern = re.compile(r"(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}/\d{1,2}/\d{4})")
        for elem in soup.find_all(["p", "div", "span", "h2", "h3"]):
            text = elem.get_text(strip=True)
            match = date_pattern.search(text)
            if match and len(text) < 100:
                data["possible_date"] = match.group(1)
                break

        # Address patterns
        address_elem = soup.find(["address", "div"], class_=re.compile(r"address|location|venue", re.I))
        if address_elem:
            data["possible_venue"] = address_elem.get_text(separator=", ", strip=True)

        # Find all relevant links
        links = []
        keywords = ["registry", "rsvp", "hotel", "gift", "travel", "accommod"]
        for link in soup.find_all("a", href=True):
            text = link.get_text(strip=True).lower()
            href = link["href"].lower()
            if any(word in text or word in href for word in keywords):
                links.append({"text": link.get_text(strip=True), "url": link["href"]})
        if links:
            data["relevant_links"] = links

        # Look for common sections
        section_keywords = {
            "travel_info": ["hotel", "travel", "accommodation", "stay", "lodging"],
            "schedule_info": ["schedule", "event", "itinerary", "timeline"],
            "faq_info": ["faq", "question", "q&a"],
            "registry_info": ["registry", "gift"],
        }

        for section in soup.find_all(["section", "div", "article"]):
            section_text = section.get_text(strip=True).lower()[:200]

            for field, keywords in section_keywords.items():
                if not data.get(field):
                    if any(kw in section_text for kw in keywords):
                        data[field] = section.get_text(separator="\n", strip=True)[:3000]

        # Include JSON-LD if found
        if json_ld:
            data["json_ld"] = json_ld

        # Extract full text with subpage content
        main_text = soup.get_text(separator="\n", strip=True)[:8000]
        subpage_texts = []
        for page_name, content in subpage_content.items():
            subpage_texts.append(f"\n\n=== {page_name.upper()} PAGE ===\n{content}")
        combined_text = main_text + "".join(subpage_texts)

        # Add note about available pages (photos/registry) that weren't scraped
        if pages_available:
            available_note = "\n\n=== PAGES TO REDIRECT GUESTS TO ===\n"
            available_note += "The following pages are available on the couple's wedding website. "
            available_note += "Direct guests to visit these URLs to view this content:\n"
            for page in pages_available:
                available_note += f"- {page['name']}: {page['url']}\n"
            combined_text += available_note

        data["full_text"] = combined_text[:20000]

        return data


# API endpoint for scraping
async def scrape_wedding_website(url: str) -> Dict[str, Any]:
    """
    Scrape a wedding website and return the data.

    This can be called from an API endpoint.
    """
    scraper = WeddingScraper()
    try:
        result = await scraper.scrape(url)
        return result
    finally:
        await scraper.close()
