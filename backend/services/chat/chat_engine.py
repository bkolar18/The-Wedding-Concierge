"""Chat engine for answering wedding-related questions."""
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
import anthropic

from core.config import settings


class ChatEngine:
    """AI-powered chat engine for wedding Q&A."""

    def __init__(self):
        """Initialize the chat engine with Claude."""
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.LLM_MODEL

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

        # Registry
        registry_urls = wedding_data.get('registry_urls')
        if registry_urls:
            context_parts.append("\n### Gift Registry")
            for store, url in registry_urls.items():
                context_parts.append(f"- **{store.title()}**: {url}")

        # RSVP
        if wedding_data.get('rsvp_url'):
            context_parts.append(f"\n### RSVP")
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
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Process a chat message and return a response.

        Args:
            wedding_data: The wedding data as a dictionary
            message: The user's message
            conversation_history: Previous messages in the conversation

        Returns:
            The assistant's response
        """
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

            return response.content[0].text

        except anthropic.APIError as e:
            # Log error and return friendly message
            print(f"Claude API error: {e}")
            return "I'm having a little trouble right now. Please try again in a moment!"

    async def get_greeting(self, wedding: Wedding) -> str:
        """Get an initial greeting message for a new chat session."""
        return f"""Hi there! I'm here to help you with any questions about {wedding.partner1_name} and {wedding.partner2_name}'s upcoming wedding.

You can ask me things like:
- "When and where is the ceremony?"
- "Which hotel has the room block?"
- "What's the dress code?"
- "How do I RSVP?"

What would you like to know?"""
