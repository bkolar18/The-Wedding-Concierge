# Claude Context - Wedding Chat Tool

**Last Updated:** January 6, 2026
**Session:** Feature Complete - Ready for User Acquisition

---

## Live Deployment URLs

| Service | URL | Platform |
|---------|-----|----------|
| **Frontend** | https://the-wedding-concierge.vercel.app | Vercel |
| **Backend API** | https://wedding-concierge-api.onrender.com/ | Render |
| **GitHub** | https://github.com/bkolar18/The-Wedding-Concierge.git | GitHub |

---

## Project Overview

### What We're Building

**Wedding Chat Tool** is a SaaS product that provides AI-powered chat assistants for wedding guests. Couples create a wedding profile, and guests can ask natural language questions like "What hotel has the room block?" or "What's the dress code?" and get instant, accurate answers.

### Target Users

1. **Couples (Primary)** - Create and manage wedding information
2. **Wedding Guests** - Ask questions about the wedding via chat
3. **Wedding Vendors** - Track payments, contracts, communications
4. **Future: Wedding Planners** - Manage multiple weddings

### Business Model

- SaaS subscription for couples
- Free tier: Basic chat, manual entry only
- Standard tier ($29): Full features, website scraping, SMS, vendor management
- Premium tier ($79): White-label (no branding), priority support

---

## Current Features (January 2026) - FEATURE COMPLETE

**For comprehensive documentation, see:** `docs/FEATURE_INVENTORY.md`

### Summary (10 Categories, 40+ Endpoints)
- **AI Chat** - Context-aware responses, 1-year session persistence, guest registration
- **Wedding Management** - Events, accommodations, FAQs, venues, custom greetings
- **Vendor Management** - 15+ categories, payment tracking, budget summary, contract AI extraction
- **Guest Outreach** - SMS blasts, scheduling, templates, CSV upload, RSVP tracking, chat engagement
- **Analytics** - Chat engagement (X of Y guests used chat), topic breakdown, weekly digest emails
- **Data Import** - Scrape TheKnot/WeddingWire with Playwright stealth
- **Authentication** - JWT tokens, password reset, rate limiting
- **Payments** - Stripe subscriptions (Free/Standard/Premium tiers)
- **Public Pages** - Guest chat, QR codes, wedding preview pages
- **PWA** - Mobile-friendly, installable, offline support

---

## Architecture Overview

### Production Deployment
```
                         INTERNET
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
       ▼                    ▼                    ▼
  ┌─────────┐         ┌─────────┐         ┌─────────┐
  │ VERCEL  │         │ RENDER  │         │ RENDER  │
  │Frontend │  ───▶   │ Backend │  ───▶   │PostgreSQL│
  │Next.js  │         │ FastAPI │         │Database │
  └─────────┘         └─────────┘         └─────────┘
```

### Application Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Dashboard  │  │  Chat Page  │  │    Analytics/Vendors    │  │
│  │   (67KB)    │  │  (ChatWidget│  │     (VendorManager     │  │
│  │             │  │    45KB)    │  │       SMSManager)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/REST API
┌─────────────────────────────▼───────────────────────────────────┐
│                        BACKEND (FastAPI)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Auth API   │  │ Wedding API │  │     Vendor/SMS API      │  │
│  │  Chat API   │  │ Scrape API  │  │    Analytics/Digest     │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│  ┌──────▼──────────────────────────────────────▼─────────────┐  │
│  │                     SERVICES LAYER                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │  │
│  │  │ ChatEngine  │  │   Scraper   │  │  TwilioService  │    │  │
│  │  │ (Claude AI) │  │ (Playwright)│  │  EmailService   │    │  │
│  │  │ + Cache     │  │ (Stealth)   │  │  StripeService  │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘    │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                    DATABASE (PostgreSQL)                   │  │
│  │  users │ weddings │ guests │ vendors │ chat_sessions │ ...│  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
C:\Users\brenn\Documents\Coding Projects\Wedding Chat Tool\
│
├── backend/                          # Python/FastAPI Backend
│   ├── api/routes/
│   │   ├── auth.py                   # Registration, login, password reset
│   │   ├── chat.py                   # Chat sessions & messages
│   │   ├── wedding.py                # Wedding CRUD, events, accommodations, FAQs
│   │   ├── vendor.py                 # Vendor management & payments
│   │   ├── sms.py                    # Guest management, SMS templates, scheduling
│   │   ├── analytics.py              # Dashboard analytics
│   │   ├── digest.py                 # Weekly email digest
│   │   ├── payment.py                # Stripe integration
│   │   ├── public.py                 # Guest registration, verification
│   │   ├── scrape.py                 # Website scraping
│   │   ├── contact.py                # Contact form
│   │   └── health.py                 # Health check
│   │
│   ├── core/
│   │   ├── config.py                 # Pydantic settings
│   │   ├── database.py               # SQLAlchemy + auto-migrations
│   │   └── auth.py                   # JWT & password hashing
│   │
│   ├── models/
│   │   ├── wedding.py                # Wedding, Events, Accommodations, FAQs
│   │   ├── chat.py                   # ChatSession, ChatMessage
│   │   ├── user.py                   # User, PasswordResetToken
│   │   ├── sms.py                    # Guest, SMSTemplate, ScheduledMessage, MessageLog
│   │   ├── vendor.py                 # Vendor, VendorPayment, VendorCommunication
│   │   └── scrape.py                 # ScrapeJob
│   │
│   ├── services/
│   │   ├── chat/chat_engine.py       # Claude AI + response caching
│   │   ├── scraper/                  # Website scraper with Playwright stealth
│   │   ├── sms/                      # Twilio SMS, templates, scheduling
│   │   └── email/                    # Resend email service
│   │
│   ├── main.py                       # FastAPI app entry point
│   └── requirements.txt
│
├── frontend/                         # Next.js Frontend
│   ├── src/app/
│   │   ├── page.tsx                  # Landing page
│   │   ├── dashboard/page.tsx        # Main dashboard (67KB)
│   │   ├── chat/[accessCode]/        # Guest chat interface
│   │   ├── qr/[accessCode]/          # QR code page
│   │   ├── join/[slug]/              # Redirects to chat
│   │   ├── import/                   # Website import
│   │   ├── pricing/                  # Pricing page
│   │   ├── settings/                 # Account settings
│   │   ├── login/, register/         # Auth pages
│   │   └── forgot-password/, reset-password/
│   │
│   ├── src/components/
│   │   ├── Header.tsx                # Navigation with hamburger menu
│   │   ├── Footer.tsx
│   │   ├── VendorManager.tsx         # Vendor management (54KB)
│   │   ├── SMSManager.tsx            # Guest/SMS management (46KB)
│   │   ├── AnalyticsDashboard.tsx    # Analytics display
│   │   ├── VendorBudgetSummary.tsx
│   │   ├── QRCodeCard.tsx
│   │   ├── PWAInstallPrompt.tsx
│   │   └── chat/ChatWidget.tsx       # Interactive chat (45KB)
│   │
│   ├── src/lib/api.ts                # API client (~1700 lines)
│   └── src/context/AuthContext.tsx
│
├── docs/
│   ├── FEATURE_INVENTORY.md          # **NEW** Complete feature documentation
│   ├── VENDOR_MANAGEMENT_PROPOSAL.md # Vendor feature planning
│   └── session-notes/
│       ├── SESSION_PROMPT_WEDDING.md
│       ├── SESSION_LOG_WEDDING.md
│       └── CLAUDE_CONTEXT_WEDDING.md (this file)
│
├── vercel.json
└── .gitignore
```

---

## Database Schema

### Core Tables (January 2026)

```sql
-- Users (couples)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    wedding_id VARCHAR(36) REFERENCES weddings(id),
    subscription_tier VARCHAR(20) DEFAULT 'free',  -- free/standard/premium
    stripe_customer_id VARCHAR(100),
    stripe_payment_id VARCHAR(100),
    paid_at TIMESTAMP,
    payment_amount_cents INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Weddings
CREATE TABLE weddings (
    id VARCHAR(36) PRIMARY KEY,
    partner1_name VARCHAR(100) NOT NULL,
    partner2_name VARCHAR(100) NOT NULL,
    couple_email VARCHAR(255) UNIQUE NOT NULL,
    wedding_date DATE,
    wedding_time VARCHAR(50),
    dress_code VARCHAR(100),
    ceremony_venue_name VARCHAR(200),
    ceremony_venue_address TEXT,
    reception_venue_name VARCHAR(200),
    reception_venue_address TEXT,
    access_code VARCHAR(50),
    custom_slug VARCHAR(100),           -- NEW: Custom URL
    chat_greeting VARCHAR(500),         -- NEW: Custom greeting
    show_branding BOOLEAN DEFAULT true, -- NEW: Premium feature
    rsvp_deadline DATE,
    additional_notes TEXT,
    scraped_data JSON,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Guests (with chat tracking)
CREATE TABLE guests (
    id VARCHAR(36) PRIMARY KEY,
    wedding_id VARCHAR(36) REFERENCES weddings(id),
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    group_name VARCHAR(100),
    rsvp_status VARCHAR(20) DEFAULT 'pending',
    sms_consent BOOLEAN DEFAULT TRUE,
    opted_out BOOLEAN DEFAULT FALSE,
    opted_out_at TIMESTAMP,
    has_used_chat BOOLEAN DEFAULT FALSE,  -- NEW: Chat engagement
    first_chat_at TIMESTAMP,              -- NEW: When first used chat
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vendors
CREATE TABLE vendors (
    id VARCHAR(36) PRIMARY KEY,
    wedding_id VARCHAR(36) REFERENCES weddings(id),
    business_name VARCHAR(200) NOT NULL,
    category VARCHAR(50),  -- venue, catering, photography, etc.
    contact_name VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    website VARCHAR(255),
    instagram_handle VARCHAR(100),
    status VARCHAR(20) DEFAULT 'inquiry',  -- inquiry/quoted/booked/completed
    contract_amount DECIMAL(10,2),
    deposit_amount DECIMAL(10,2),
    deposit_paid BOOLEAN DEFAULT FALSE,
    service_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Additional tables: wedding_events, wedding_accommodations, wedding_faqs,
-- chat_sessions, chat_messages, sms_templates, scheduled_messages,
-- message_logs, vendor_payments, vendor_communications, scrape_jobs
```

---

## Key Features Implementation Details

### 1. Guest Chat with Registration

**Flow:**
1. Guest visits `/chat/{accessCode}`
2. System checks localStorage for existing session (1-year expiry)
3. If returning guest: verify via API, show welcome back message
4. If new guest: show registration form (first name, last name, phone required, email optional)
5. On submit: register guest, check for duplicates by phone, start chat session
6. Guest can now chat with AI about wedding details

**Duplicate Detection:**
- Phone number is unique identifier
- If phone exists: update name, preserve original group, return existing guest
- If new: create with group "Chat-registered"

**Session Persistence:**
```typescript
const SESSION_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
interface StoredSession {
  guestId: string;
  guestName: string;
  timestamp: number;
}
```

### 2. Guest Chat Engagement Tracking

**Database Fields:**
- `has_used_chat: Boolean` - Set to true when guest uses chat
- `first_chat_at: DateTime` - Timestamp of first chat usage

**Analytics Display:**
- Dashboard: Teal/emerald gradient card showing "X / Y guests have used chat"
- Weekly Email: "Guest Chat Engagement" section with same stats
- Percentage calculation: `(guests_who_used_chat / total_guests) * 100`

### 3. Auto-Migrations

Since Render free tier doesn't provide shell access, migrations run automatically on startup.

**Location:** `backend/core/database.py` - `run_migrations()`

**Current migrations:**
```python
migrations = [
    # Add chat_greeting column
    """DO $$ BEGIN
        IF NOT EXISTS (...) THEN
            ALTER TABLE weddings ADD COLUMN chat_greeting VARCHAR(500);
        END IF;
    END $$;""",
    # Add show_branding, custom_slug, has_used_chat, first_chat_at...
]
```

### 4. CORS on Exception Handlers

**Problem:** CORS headers were missing on error responses, causing frontend to fail.

**Solution:** Added `get_cors_headers(request)` helper and apply to all exception handlers:
- `HTTPException` handler
- `RateLimitExceeded` handler
- Generic `Exception` handler

---

## Scraper System Architecture

### Overview
Multi-page scraper with Playwright stealth for anti-bot bypass. Extracts wedding data from TheKnot, WeddingWire, and other platforms.

### Data Flow
```
URL → WeddingScraper
      │
      ├── _should_use_browser(url)  [Check if browser required]
      │
      ├── _fetch_page(url) [TIERED FALLBACK]
      │   ├── Tier 1: httpx (fast)
      │   └── Tier 2: Playwright stealth (if blocked)
      │
      ├── BeautifulSoup parsing
      ├── _find_subpages() → travel, schedule, registry, etc.
      ├── _clean_page_text() → Filter garbage
      ├── Prioritize content (travel first)
      └── Platform-specific extraction
           └── Returns raw_data

raw_data → WeddingDataMapper
           │
           ├── _extract_with_claude() [35000 char limit]
           └── Returns structured wedding data
```

### Browser Required Platforms
```python
BROWSER_REQUIRED_PLATFORMS = {
    "theknot.com": True,      # Akamai CDN protection
    "weddingwire.com": True,  # Same owner as The Knot
}
```

---

## Configuration

### Backend Environment Variables
```bash
DATABASE_URL=postgresql+asyncpg://...
SECRET_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
RESEND_API_KEY=re_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STANDARD_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
FRONTEND_URL=https://the-wedding-concierge.vercel.app
```

### Frontend Environment Variables
```bash
NEXT_PUBLIC_API_URL=https://wedding-concierge-api.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

---

## Development Roadmap

### Phases 1-6: COMPLETE (December 2024 - January 2026)
- [x] MVP with AI chat
- [x] Website scraping with Playwright stealth
- [x] Production deployment (Vercel + Render)
- [x] Guest management with SMS
- [x] Vendor management with payments
- [x] Analytics with weekly digest
- [x] Stripe payment integration
- [x] Guest chat engagement tracking
- [x] Feature documentation

### Phase 7: User Acquisition (CURRENT)
- [ ] Get 2-5 couples using the platform
- [ ] Collect user feedback
- [ ] Iterate based on actual usage

### Future Considerations
- Calendar integration (Google/Apple)
- Multi-language chat support
- Photo gallery
- Native mobile apps
- Wedding planner accounts

---

## Common Issues & Solutions

### CORS errors on exceptions
**Cause:** Exception handlers missing CORS headers
**Fix:** Added `get_cors_headers(request)` to all exception handlers in `main.py`

### Database column doesn't exist
**Cause:** Migration not run on production
**Fix:** Auto-migrations in `core/database.py` `run_migrations()`

### Session not persisting
**Cause:** localStorage expiry too short
**Fix:** Extended to 1 year (365 days)

### Duplicate guests when registering via chat
**Cause:** No duplicate detection
**Fix:** Check phone number before creating guest, update existing if found

### Render free tier cold starts
**Note:** Server sleeps after 15 min inactivity, first request takes ~30 seconds
**Not a bug** - normal for free tier

---

## Key Files Reference

| Category | File | Purpose |
|----------|------|---------|
| **Docs** | `docs/FEATURE_INVENTORY.md` | Complete feature documentation |
| **Chat** | `frontend/src/components/chat/ChatWidget.tsx` | Guest chat with registration |
| **Chat** | `backend/services/chat/chat_engine.py` | Claude AI + response caching |
| **Analytics** | `backend/api/routes/analytics.py` | Dashboard analytics |
| **Analytics** | `frontend/src/components/AnalyticsDashboard.tsx` | Analytics display |
| **Vendor** | `backend/api/routes/vendor.py` | Vendor CRUD & payments |
| **Vendor** | `frontend/src/components/VendorManager.tsx` | Vendor UI |
| **SMS** | `backend/api/routes/sms.py` | Guest & SMS management |
| **SMS** | `frontend/src/components/SMSManager.tsx` | SMS UI |
| **Scraper** | `backend/services/scraper/scraper.py` | Website scraper |
| **Scraper** | `backend/services/scraper/browser_fetch.py` | Playwright stealth |
| **Migrations** | `backend/core/database.py` | Auto-migrations |
| **CORS** | `backend/main.py` | CORS headers on exceptions |

---

## Branding

### Logo: Bell Hop Bell (Concierge Service Bell)
- Custom SVG positioned to the RIGHT of "The Wedding Concierge" text
- Color: `text-rose-500` (Tailwind pink/rose)
- Files: Header.tsx, Footer.tsx, login/page.tsx, register/page.tsx
