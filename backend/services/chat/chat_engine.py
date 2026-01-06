"""Chat engine for answering wedding-related questions."""
import hashlib
import logging
from typing import Optional, List, Dict, Any, Tuple, TYPE_CHECKING
from datetime import datetime, date
from collections import OrderedDict
import anthropic

from core.config import settings

if TYPE_CHECKING:
    from models.wedding import Wedding

logger = logging.getLogger(__name__)


class ResponseCache:
    """
    Simple in-memory LRU cache for chat responses.

    Caches responses for common questions to reduce API costs.
    Cache is invalidated when wedding data changes (via wedding_id + data hash).

    Storage: ~1KB per cached response, 100 entries = ~100KB max
    """

    def __init__(self, max_size: int = 100, ttl_seconds: int = 3600):
        """
        Initialize cache.

        Args:
            max_size: Maximum number of cached responses (LRU eviction)
            ttl_seconds: Time-to-live for cache entries (1 hour default)
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, Tuple[str, float]] = OrderedDict()

    def _make_key(self, wedding_id: str, message: str, data_hash: str) -> str:
        """Create cache key from wedding ID, normalized message, and data hash."""
        # Normalize message: lowercase, strip whitespace, remove punctuation
        normalized = message.lower().strip().rstrip('?!.')
        # Include data_hash so cache invalidates when wedding data changes
        key_str = f"{wedding_id}:{data_hash}:{normalized}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def get(self, wedding_id: str, message: str, data_hash: str) -> Optional[str]:
        """Get cached response if exists and not expired."""
        key = self._make_key(wedding_id, message, data_hash)

        if key not in self._cache:
            return None

        response, timestamp = self._cache[key]
        now = datetime.utcnow().timestamp()

        # Check if expired
        if now - timestamp > self.ttl_seconds:
            del self._cache[key]
            return None

        # Move to end (most recently used)
        self._cache.move_to_end(key)
        logger.debug(f"Cache HIT for message: {message[:50]}...")
        return response

    def set(self, wedding_id: str, message: str, data_hash: str, response: str):
        """Cache a response."""
        key = self._make_key(wedding_id, message, data_hash)

        # Evict oldest if at capacity
        while len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)

        self._cache[key] = (response, datetime.utcnow().timestamp())
        logger.debug(f"Cache SET for message: {message[:50]}...")

    def invalidate_wedding(self, wedding_id: str):
        """Invalidate all cache entries for a wedding (called when data updates)."""
        # Since we use data_hash in keys, old entries will naturally miss
        # This method is here for explicit invalidation if needed
        pass

    @property
    def stats(self) -> Dict[str, int]:
        """Get cache statistics."""
        return {
            "size": len(self._cache),
            "max_size": self.max_size
        }


# Global cache instance
_response_cache = ResponseCache(max_size=100, ttl_seconds=3600)


def get_data_hash(wedding_data: Dict[str, Any]) -> str:
    """Create a hash of wedding data to detect changes."""
    # Only hash key fields that affect responses
    key_fields = [
        wedding_data.get('partner1_name', ''),
        wedding_data.get('partner2_name', ''),
        str(wedding_data.get('wedding_date', '')),
        wedding_data.get('dress_code', ''),
        wedding_data.get('ceremony_venue_name', ''),
        wedding_data.get('ceremony_venue_address', ''),
        str(len(wedding_data.get('accommodations', []))),
        str(len(wedding_data.get('events', []))),
        str(len(wedding_data.get('faqs', []))),
    ]
    return hashlib.md5('|'.join(key_fields).encode()).hexdigest()[:8]


class ChatEngine:
    """AI-powered chat engine for wedding Q&A."""

    def __init__(self):
        """Initialize the chat engine with Claude Haiku for cost efficiency."""
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.LLM_MODEL  # claude-3-5-haiku-20241022
        self.cache = _response_cache

    def _format_date(self, d: Optional[date]) -> Optional[str]:
        """Format a date object to string."""
        if d is None:
            return None
        if isinstance(d, str):
            return d
        return d.strftime('%B %d, %Y')

    def build_wedding_context(self, wedding_data: Dict[str, Any]) -> str:
        """Build a context string from wedding data for the LLM."""
        context_parts = []

        # Basic info
        context_parts.append(f"## Wedding of {wedding_data['partner1_name']} & {wedding_data['partner2_name']}")

        if wedding_data.get('wedding_date'):
            context_parts.append(f"**Date**: {self._format_date(wedding_data['wedding_date'])}")

        if wedding_data.get('wedding_time'):
            context_parts.append(f"**Time**: {wedding_data['wedding_time']}")

        if wedding_data.get('dress_code'):
            context_parts.append(f"**Dress Code**: {wedding_data['dress_code']}")

        # Ceremony
        if wedding_data.get('ceremony_venue_name'):
            context_parts.append("\n### Ceremony")
            context_parts.append(f"**Venue**: {wedding_data['ceremony_venue_name']}")
            if wedding_data.get('ceremony_venue_address'):
                context_parts.append(f"**Address**: {wedding_data['ceremony_venue_address']}")
            if wedding_data.get('ceremony_venue_url'):
                context_parts.append(f"**Website**: {wedding_data['ceremony_venue_url']}")

        # Reception
        if wedding_data.get('reception_venue_name'):
            context_parts.append("\n### Reception")
            context_parts.append(f"**Venue**: {wedding_data['reception_venue_name']}")
            if wedding_data.get('reception_venue_address'):
                context_parts.append(f"**Address**: {wedding_data['reception_venue_address']}")
            if wedding_data.get('reception_time'):
                context_parts.append(f"**Time**: {wedding_data['reception_time']}")
            if wedding_data.get('reception_venue_url'):
                context_parts.append(f"**Website**: {wedding_data['reception_venue_url']}")

        # Accommodations
        accommodations = wedding_data.get('accommodations', [])
        if accommodations:
            context_parts.append("\n### Hotels & Accommodations")
            for acc in accommodations:
                context_parts.append(f"\n**{acc['hotel_name']}**")
                if acc.get('address'):
                    context_parts.append(f"- Address: {acc['address']}")
                if acc.get('phone'):
                    context_parts.append(f"- Phone: {acc['phone']}")
                if acc.get('distance_to_venue'):
                    context_parts.append(f"- Distance to venue: {acc['distance_to_venue']}")
                if acc.get('has_room_block'):
                    context_parts.append("- **Room block available!**")
                    if acc.get('room_block_name'):
                        context_parts.append(f"  - Block name: {acc['room_block_name']}")
                    if acc.get('room_block_code'):
                        context_parts.append(f"  - Code: {acc['room_block_code']}")
                    if acc.get('room_block_rate'):
                        context_parts.append(f"  - Rate: {acc['room_block_rate']}")
                    if acc.get('room_block_deadline'):
                        context_parts.append(f"  - Book by: {self._format_date(acc['room_block_deadline'])}")
                if acc.get('booking_url'):
                    context_parts.append(f"- Booking link: {acc['booking_url']}")
                if acc.get('notes'):
                    context_parts.append(f"- Notes: {acc['notes']}")

        # Other events
        events = wedding_data.get('events', [])
        if events:
            context_parts.append("\n### Other Events")
            for event in events:
                context_parts.append(f"\n**{event['event_name']}**")
                if event.get('event_date'):
                    context_parts.append(f"- Date: {self._format_date(event['event_date'])}")
                if event.get('event_time'):
                    context_parts.append(f"- Time: {event['event_time']}")
                if event.get('venue_name'):
                    context_parts.append(f"- Venue: {event['venue_name']}")
                if event.get('venue_address'):
                    context_parts.append(f"- Address: {event['venue_address']}")
                if event.get('dress_code'):
                    context_parts.append(f"- Dress code: {event['dress_code']}")
                if event.get('description'):
                    context_parts.append(f"- Details: {event['description']}")

        # Vendors
        vendors = wedding_data.get('vendors', [])
        if vendors:
            context_parts.append("\n### Wedding Vendors")
            # Group by category for cleaner output
            vendor_categories = {}
            for vendor in vendors:
                category = vendor.get('category', 'Other')
                if category not in vendor_categories:
                    vendor_categories[category] = []
                vendor_categories[category].append(vendor)

            for category, category_vendors in vendor_categories.items():
                # Format category name nicely
                category_display = category.replace('_', ' ').title()
                context_parts.append(f"\n**{category_display}**")
                for vendor in category_vendors:
                    context_parts.append(f"- {vendor.get('business_name', 'Unknown')}")
                    if vendor.get('contact_name'):
                        context_parts.append(f"  - Contact: {vendor['contact_name']}")
                    if vendor.get('email'):
                        context_parts.append(f"  - Email: {vendor['email']}")
                    if vendor.get('phone'):
                        context_parts.append(f"  - Phone: {vendor['phone']}")
                    if vendor.get('website_url'):
                        context_parts.append(f"  - Website: {vendor['website_url']}")
                    if vendor.get('instagram_handle'):
                        context_parts.append(f"  - Instagram: @{vendor['instagram_handle'].lstrip('@')}")
                    if vendor.get('service_description'):
                        context_parts.append(f"  - Services: {vendor['service_description']}")

        # Registry
        registry_urls = wedding_data.get('registry_urls')
        if registry_urls:
            context_parts.append("\n### Gift Registry")
            for store, url in registry_urls.items():
                context_parts.append(f"- **{store.title()}**: {url}")

        # RSVP
        if wedding_data.get('rsvp_url') or wedding_data.get('rsvp_deadline'):
            context_parts.append(f"\n### RSVP")
            if wedding_data.get('rsvp_deadline'):
                context_parts.append(f"**RSVP Deadline**: {self._format_date(wedding_data['rsvp_deadline'])}")
            if wedding_data.get('rsvp_url'):
                context_parts.append(f"RSVP link: {wedding_data['rsvp_url']}")

        # Wedding website
        if wedding_data.get('wedding_website_url'):
            context_parts.append(f"\n### Wedding Website")
            context_parts.append(f"Full details: {wedding_data['wedding_website_url']}")

        # FAQs
        faqs = wedding_data.get('faqs', [])
        if faqs:
            context_parts.append("\n### Frequently Asked Questions")
            for faq in faqs:
                context_parts.append(f"\n**Q: {faq['question']}**")
                context_parts.append(f"A: {faq['answer']}")

        # Additional notes
        if wedding_data.get('additional_notes'):
            context_parts.append(f"\n### Additional Information")
            context_parts.append(wedding_data['additional_notes'])

        # RAG: Include full scraped website content for comprehensive Q&A
        # This enables answering questions about Things to Do, Wedding Party, etc.
        full_text = wedding_data.get('full_text')
        if full_text:
            context_parts.append("\n\n---\n")
            context_parts.append("### Complete Wedding Website Content")
            context_parts.append("The following is additional content from the wedding website. Use this to answer questions about topics not covered above (local activities, wedding party, travel tips, restaurants, etc.):\n")
            context_parts.append(full_text)

        return "\n".join(context_parts)

    def build_system_prompt(self, wedding_data: Dict[str, Any]) -> str:
        """Build the system prompt for the chat."""
        wedding_context = self.build_wedding_context(wedding_data)

        # Add RAG-specific instructions if full_text is available
        has_full_text = bool(wedding_data.get('full_text'))

        rag_instructions = ""
        if has_full_text:
            rag_instructions = """
7. For critical details (dates, times, venues, hotels), prefer the structured information at the top
8. For other topics (Things to Do, Wedding Party, travel tips, local restaurants, the couple's story, etc.), use the Complete Wedding Website Content section
9. You can answer ANY question that has information somewhere in the wedding content"""

        return f"""You are a friendly and helpful wedding assistant for the wedding of {wedding_data['partner1_name']} and {wedding_data['partner2_name']}. Your job is to answer questions from wedding guests about the upcoming wedding.

## Your Personality
- Warm and welcoming, like a helpful friend
- Concise but complete - give all the relevant info without rambling
- Always include specific details like dates, times, addresses, and links when relevant
- If you don't know something, say so honestly and suggest where they might find the answer

## Important Guidelines
1. Only answer based on the wedding information provided below
2. Always include relevant links when available (booking links, RSVP links, etc.)
3. If asked about something not in the wedding info, politely say you don't have that information
4. Use plain text only - NO markdown formatting (no ##, **, *, or other symbols)
5. Use simple dashes (-) for lists, and blank lines to separate sections
6. Be especially helpful about hotels/room blocks, timing, and logistics
7. Never make up information that isn't in the wedding details{rag_instructions}

## Wedding Information

{wedding_context}

---

Now help the wedding guests with their questions!"""

    async def chat(
        self,
        wedding_data: Dict[str, Any],
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        wedding_id: Optional[str] = None
    ) -> str:
        """
        Process a chat message and return a response.

        Uses caching for first messages in a conversation (no history)
        to reduce API costs for common questions like "what's the dress code?"

        Args:
            wedding_data: The wedding data as a dictionary
            message: The user's message
            conversation_history: Previous messages in the conversation
            wedding_id: Optional wedding ID for caching

        Returns:
            The assistant's response
        """
        # Only cache first messages (no conversation history)
        # Follow-up questions need full context
        can_cache = wedding_id and (not conversation_history or len(conversation_history) <= 1)

        if can_cache:
            data_hash = get_data_hash(wedding_data)
            cached = self.cache.get(wedding_id, message, data_hash)
            if cached:
                return cached

        system_prompt = self.build_system_prompt(wedding_data)

        # Build messages list
        messages = []

        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

        # Add current message
        messages.append({
            "role": "user",
            "content": message
        })

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=system_prompt,
                messages=messages
            )

            result = response.content[0].text

            # Cache the response for future identical questions
            if can_cache and wedding_id:
                data_hash = get_data_hash(wedding_data)
                self.cache.set(wedding_id, message, data_hash, result)

            return result

        except anthropic.APIError as e:
            # Log error and return friendly message
            logger.error(f"Claude API error: {e}")
            return "I'm having a little trouble right now. Please try again in a moment!"

    async def get_greeting(self, wedding: "Wedding") -> str:
        """Get an initial greeting message for a new chat session.

        Uses custom greeting if set by the couple, otherwise uses default.
        """
        # Use custom greeting if the couple has set one
        if wedding.chat_greeting:
            return wedding.chat_greeting

        # Default greeting
        return f"""Hi there! I'm here to help you with any questions about {wedding.partner1_name} and {wedding.partner2_name}'s upcoming wedding.

You can ask me things like:
- "When and where is the ceremony?"
- "Which hotel has the room block?"
- "What's the dress code?"
- "How do I RSVP?"

What would you like to know?"""
