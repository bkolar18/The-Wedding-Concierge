"""Template service for rendering SMS templates with variables."""
import re
from datetime import date, datetime
from typing import Optional, Dict, Any, Callable

from models.wedding import Wedding
from models.sms import Guest


def format_date(d: Optional[date]) -> str:
    """Format date for SMS display."""
    if not d:
        return "TBD"
    return d.strftime("%B %d, %Y")  # e.g., "June 15, 2025"


def format_time(t: Optional[str]) -> str:
    """Format time for SMS display."""
    return t or "TBD"


class TemplateService:
    """Service for rendering SMS templates with dynamic variables."""

    # Available template variables and their resolvers
    # Each resolver takes (guest, wedding) and returns a string
    VARIABLES: Dict[str, Callable[[Guest, Wedding], str]] = {
        "guest_name": lambda g, w: g.name,
        "partner1": lambda g, w: w.partner1_name,
        "partner2": lambda g, w: w.partner2_name,
        "couple_names": lambda g, w: f"{w.partner1_name} & {w.partner2_name}",
        "wedding_date": lambda g, w: format_date(w.wedding_date),
        "wedding_time": lambda g, w: format_time(w.wedding_time),
        "ceremony_venue": lambda g, w: w.ceremony_venue_name or "TBD",
        "ceremony_address": lambda g, w: w.ceremony_venue_address or "",
        "reception_venue": lambda g, w: w.reception_venue_name or w.ceremony_venue_name or "TBD",
        "reception_address": lambda g, w: w.reception_venue_address or "",
        "dress_code": lambda g, w: w.dress_code or "Not specified",
        "rsvp_deadline": lambda g, w: format_date(w.rsvp_deadline),
        "chat_link": lambda g, w: f"https://the-wedding-concierge.vercel.app/chat/{w.access_code}",
        "access_code": lambda g, w: w.access_code or "",
    }

    # Pattern to match {{variable_name}}
    VARIABLE_PATTERN = re.compile(r"\{\{(\w+)\}\}")

    def render(self, template: str, guest: Guest, wedding: Wedding) -> str:
        """
        Render a template string by replacing {{variable}} placeholders.

        Args:
            template: Template string with {{variable}} placeholders
            guest: Guest object for guest-specific variables
            wedding: Wedding object for wedding-specific variables

        Returns:
            Rendered string with all variables replaced
        """
        def replace_var(match: re.Match) -> str:
            var_name = match.group(1)
            if var_name in self.VARIABLES:
                try:
                    return self.VARIABLES[var_name](guest, wedding)
                except Exception:
                    return f"[{var_name}]"  # Fallback if variable fails
            return match.group(0)  # Keep original if not found

        return self.VARIABLE_PATTERN.sub(replace_var, template)

    def get_available_variables(self) -> list[dict]:
        """
        Get list of available template variables with descriptions.

        Returns:
            List of dicts with variable name and description
        """
        descriptions = {
            "guest_name": "Guest's name",
            "partner1": "First partner's name",
            "partner2": "Second partner's name",
            "couple_names": "Both partners' names (e.g., 'John & Jane')",
            "wedding_date": "Wedding date (e.g., 'June 15, 2025')",
            "wedding_time": "Ceremony time",
            "ceremony_venue": "Ceremony venue name",
            "ceremony_address": "Ceremony venue address",
            "reception_venue": "Reception venue name",
            "reception_address": "Reception venue address",
            "dress_code": "Dress code",
            "rsvp_deadline": "RSVP deadline date",
            "chat_link": "Link to the wedding chatbot",
            "access_code": "Wedding access code",
        }

        return [
            {"name": name, "description": descriptions.get(name, "")}
            for name in self.VARIABLES.keys()
        ]

    def preview(self, template: str, wedding: Wedding) -> str:
        """
        Generate a preview of the template with sample guest data.

        Args:
            template: Template string with {{variable}} placeholders
            wedding: Wedding object for wedding-specific variables

        Returns:
            Rendered preview string
        """
        # Create a sample guest for preview
        class SampleGuest:
            name = "Sample Guest"

        return self.render(template, SampleGuest(), wedding)  # type: ignore

    def validate_template(self, template: str) -> tuple[bool, list[str]]:
        """
        Validate a template string.

        Args:
            template: Template string to validate

        Returns:
            Tuple of (is_valid, list of unknown variables)
        """
        matches = self.VARIABLE_PATTERN.findall(template)
        unknown = [m for m in matches if m not in self.VARIABLES]
        return len(unknown) == 0, unknown


# Default templates to seed the database
DEFAULT_TEMPLATES = [
    {
        "name": "Welcome Message",
        "category": "welcome",
        "content": (
            "Hi {{guest_name}}! {{partner1}} & {{partner2}} are getting married! "
            "Get all the details here: {{chat_link}}"
        ),
    },
    {
        "name": "RSVP Reminder",
        "category": "reminder",
        "content": (
            "Hey {{guest_name}}, friendly reminder to RSVP for {{couple_names}}'s wedding by {{rsvp_deadline}}! "
            "RSVP here: {{chat_link}}"
        ),
    },
    {
        "name": "Day Before",
        "category": "reminder",
        "content": (
            "{{guest_name}}, the big day is tomorrow! "
            "{{couple_names}}'s wedding starts at {{wedding_time}}. "
            "Venue: {{ceremony_venue}}"
        ),
    },
    {
        "name": "Thank You",
        "category": "update",
        "content": (
            "Thank you for celebrating with us, {{guest_name}}! "
            "- {{partner1}} & {{partner2}}"
        ),
    },
]


# Singleton instance
template_service = TemplateService()
