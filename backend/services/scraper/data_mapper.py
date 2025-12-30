"""Map scraped wedding website data to structured Wedding model format."""
import re
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from anthropic import AsyncAnthropic

from core.config import settings

# Set up logging
logger = logging.getLogger(__name__)


class WeddingDataMapper:
    """Maps raw scraped data to structured wedding data using Claude for intelligent extraction."""

    def __init__(self):
        """Initialize the data mapper with Claude client."""
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            logger.error("ANTHROPIC_API_KEY not set in settings!")
        else:
            logger.info(f"Initializing Claude client with API key: {api_key[:20]}...")
        self.client = AsyncAnthropic(api_key=api_key)

    async def extract_structured_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract structured wedding data from raw scraped data.

        Uses Claude to intelligently parse and structure the data.
        """
        # First try to extract what we can directly
        direct_extracted = self._extract_direct_fields(raw_data)

        # Use Claude to extract additional structured data from full text
        full_text = raw_data.get("full_text", "")
        if full_text:
            llm_extracted = await self._extract_with_claude(full_text, raw_data)
            # Merge, preferring direct extraction for basic fields
            return self._merge_data(direct_extracted, llm_extracted)

        return direct_extracted

    def _extract_direct_fields(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract fields directly from structured scraped data."""
        result = {
            "partner1_name": "",
            "partner2_name": "",
            "wedding_date": None,
            "wedding_time": None,
            "dress_code": None,
            "ceremony_venue_name": None,
            "ceremony_venue_address": None,
            "reception_venue_name": None,
            "reception_venue_address": None,
            "reception_time": None,
            "registry_urls": None,
            "rsvp_url": None,
            "additional_notes": None,
            "events": [],
            "accommodations": [],
            "faqs": []
        }

        # Extract couple names from various sources
        couple_names = raw_data.get("couple_names", "") or raw_data.get("main_heading", "") or raw_data.get("page_title", "")
        if couple_names:
            names = self._parse_couple_names(couple_names)
            result["partner1_name"] = names[0]
            result["partner2_name"] = names[1]

        # Extract date
        date_text = raw_data.get("wedding_date_text", "") or raw_data.get("possible_date", "")
        if date_text:
            result["wedding_date"] = self._parse_date(date_text)

        # Extract RSVP URL
        if raw_data.get("rsvp_url"):
            result["rsvp_url"] = raw_data["rsvp_url"]

        # Extract registry links
        registry_links = raw_data.get("registry_links", [])
        if registry_links:
            result["registry_urls"] = {
                link.get("text", f"Registry {i+1}"): link.get("url", "")
                for i, link in enumerate(registry_links)
                if link.get("url")
            }

        return result

    def _parse_couple_names(self, text: str) -> tuple:
        """Parse partner names from text like 'Jane & John' or 'Jane and John Smith'."""
        # Clean up the text
        text = text.strip()

        # Remove common suffixes
        text = re.sub(r"'s Wedding.*$", "", text, flags=re.IGNORECASE)
        text = re.sub(r" Wedding.*$", "", text, flags=re.IGNORECASE)
        text = re.sub(r" - .*$", "", text)

        # Try to split by common separators
        separators = [" & ", " and ", " AND ", " + "]
        for sep in separators:
            if sep.lower() in text.lower():
                # Case-insensitive split
                parts = re.split(re.escape(sep), text, flags=re.IGNORECASE)
                if len(parts) >= 2:
                    name1 = parts[0].strip()
                    name2 = parts[1].strip()
                    return (name1, name2)

        # Fallback: just return the whole text as partner1
        return (text, "")

    def _parse_date(self, text: str) -> Optional[str]:
        """Parse a date string into ISO format."""
        if not text:
            return None

        # Common date patterns
        patterns = [
            r"(\d{1,2})/(\d{1,2})/(\d{4})",  # MM/DD/YYYY or M/D/YYYY
            r"(\w+)\s+(\d{1,2}),?\s+(\d{4})",  # Month DD, YYYY
            r"(\d{1,2})\s+(\w+)\s+(\d{4})",  # DD Month YYYY
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    groups = match.groups()
                    if pattern == patterns[0]:
                        # MM/DD/YYYY
                        month, day, year = int(groups[0]), int(groups[1]), int(groups[2])
                        return f"{year}-{month:02d}-{day:02d}"
                    elif pattern == patterns[1]:
                        # Month DD, YYYY
                        month_name, day, year = groups[0], int(groups[1]), int(groups[2])
                        month = self._month_to_number(month_name)
                        if month:
                            return f"{year}-{month:02d}-{day:02d}"
                    elif pattern == patterns[2]:
                        # DD Month YYYY
                        day, month_name, year = int(groups[0]), groups[1], int(groups[2])
                        month = self._month_to_number(month_name)
                        if month:
                            return f"{year}-{month:02d}-{day:02d}"
                except (ValueError, IndexError):
                    continue

        return None

    def _month_to_number(self, month_name: str) -> Optional[int]:
        """Convert month name to number."""
        months = {
            "january": 1, "february": 2, "march": 3, "april": 4,
            "may": 5, "june": 6, "july": 7, "august": 8,
            "september": 9, "october": 10, "november": 11, "december": 12,
            "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6,
            "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
        }
        return months.get(month_name.lower().strip())

    async def _extract_with_claude(self, full_text: str, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Use Claude to intelligently extract structured wedding data."""
        # Truncate text if too long - allow more for multi-page scraping
        max_chars = 35000
        if len(full_text) > max_chars:
            full_text = full_text[:max_chars] + "..."

        # Diagnostic logging
        logger.info(f"Text to Claude: {len(full_text)} chars")
        logger.info(f"Contains 'hotel': {'hotel' in full_text.lower()}")
        logger.info(f"Contains 'travel': {'=== TRAVEL' in full_text}")
        logger.info(f"Contains 'accommod': {'accommod' in full_text.lower()}")

        prompt = f"""Extract structured wedding information from this wedding website content.

CRITICAL: Look carefully for hotel/accommodation information. It typically appears:
- In sections marked "=== TRAVEL PAGE ===" or similar
- Near keywords like "where to stay", "hotel", "room block", "accommodations", "lodging"
- With booking codes, special rates, group names, or reservation links

Return a JSON object with the following fields (use null for missing data):

{{
    "partner1_name": "First partner's full name",
    "partner2_name": "Second partner's full name",
    "wedding_date": "YYYY-MM-DD format or null",
    "wedding_time": "HH:MM AM/PM format or null",
    "dress_code": "Dress code description or null",
    "ceremony_venue_name": "Ceremony venue name or null",
    "ceremony_venue_address": "Full address or null",
    "reception_venue_name": "Reception venue name (if different from ceremony) or null",
    "reception_venue_address": "Full address or null",
    "reception_time": "HH:MM AM/PM format or null",
    "events": [
        {{
            "event_name": "e.g. Rehearsal Dinner, Welcome Party",
            "event_date": "YYYY-MM-DD or null",
            "event_time": "HH:MM AM/PM or null",
            "venue_name": "venue name or null",
            "venue_address": "address or null",
            "description": "description or null",
            "dress_code": "dress code or null"
        }}
    ],
    "accommodations": [
        {{
            "hotel_name": "Hotel name (e.g. Marriott, Hilton, Hampton Inn)",
            "address": "Full address or null",
            "phone": "Phone number or null",
            "booking_url": "Booking URL or null",
            "has_room_block": true/false,
            "room_block_name": "Block name (e.g. 'Smith-Jones Wedding') or null",
            "room_block_code": "Booking code or null",
            "room_block_rate": "Rate description (e.g. '$159/night') or null",
            "room_block_deadline": "Deadline date or null",
            "notes": "Additional notes like amenities, distance to venue, shuttle info, etc."
        }}
    ],
    "faqs": [
        {{
            "question": "Question text",
            "answer": "Answer text",
            "category": "Category like Travel, Attire, etc. or null"
        }}
    ],
    "additional_notes": "Any other important info or null"
}}

EXTRACTION PRIORITIES:
1. Partner names - usually in format "Name1 & Name2" or "Name1 and Name2"
2. HOTELS/ACCOMMODATIONS - Look in TRAVEL PAGE sections for hotel names, addresses, room block codes, rates
3. Events - rehearsal dinner, welcome party, ceremony, reception, brunch
4. Q&A or FAQ sections

Return ONLY valid JSON, no explanation.

Website content:
{full_text}"""

        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            # Extract JSON from response
            response_text = response.content[0].text
            # Try to find JSON in the response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                result = json.loads(json_match.group())
                # Diagnostic logging for extracted data
                accommodations = result.get('accommodations', [])
                logger.info(f"Claude extracted: {len(accommodations)} accommodations")
                if accommodations:
                    logger.info(f"Accommodations: {accommodations}")
                else:
                    logger.warning("No accommodations extracted by Claude!")
                return result
            logger.warning("No JSON found in Claude response")
            return {}

        except Exception as e:
            logger.error(f"Claude extraction error: {e}")
            return {}

    def _merge_data(self, direct: Dict[str, Any], llm: Dict[str, Any]) -> Dict[str, Any]:
        """Merge direct extraction with LLM extraction, preferring non-empty values."""
        result = direct.copy()

        for key, value in llm.items():
            if value is not None:
                # For simple fields, prefer LLM if direct is empty
                if key in ["partner1_name", "partner2_name"]:
                    if not result.get(key) and value:
                        result[key] = value
                # For lists, extend
                elif key in ["events", "accommodations", "faqs"]:
                    if isinstance(value, list) and value:
                        result[key] = value
                # For other fields, prefer LLM if we don't have it
                elif not result.get(key):
                    result[key] = value

        return result
