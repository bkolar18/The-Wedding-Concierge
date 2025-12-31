# Claude Context - Wedding Chat Tool

**Last Updated:** December 30, 2024
**Session:** DEPLOYED - Frontend (Vercel) & Backend (Render) Live!

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
3. **Future: Wedding Planners** - Manage multiple weddings

### Business Model

- SaaS subscription for couples
- Free tier: Basic chat, manual entry only
- Paid tier: Website scraping, SMS, analytics, custom branding

---

## Architecture Overview

### Production Deployment (Dec 30, 2024)
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

**Live URLs:**
- Frontend: https://the-wedding-concierge.vercel.app
- Backend: https://wedding-concierge-api.onrender.com/

### Application Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Landing    │  │   Import    │  │    Embeddable Chat      │  │
│  │   Page      │  │    Page     │  │       Widget            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/REST API
┌─────────────────────────────▼───────────────────────────────────┐
│                        BACKEND (FastAPI)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Chat API   │  │ Wedding API │  │     Scraper API         │  │
│  │  /api/chat  │  │ /api/wedding│  │    /api/scrape          │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│  ┌──────▼──────────────────────────────────────▼─────────────┐  │
│  │                     SERVICES LAYER                         │  │
│  │  ┌─────────────┐  ┌───────────────────────────────────┐   │  │
│  │  │ ChatEngine  │  │         SCRAPER SYSTEM            │   │  │
│  │  │ (Claude AI) │  │  ┌───────────┐  ┌─────────────┐  │   │  │
│  │  └─────────────┘  │  │ Scraper   │  │ DataMapper  │  │   │  │
│  │                   │  │ (httpx+BS)│  │ (Claude AI) │  │   │  │
│  │  ┌─────────────┐  │  └───────────┘  └─────────────┘  │   │  │
│  │  │ (Future:    │  │                                   │   │  │
│  │  │  SMS/Twilio)│  └───────────────────────────────────┘   │  │
│  │  └─────────────┘                                          │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                    DATABASE (SQLite/PostgreSQL)            │  │
│  │  weddings │ wedding_events │ wedding_accommodations │ ... │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
C:\Users\brenn\Documents\Coding Projects\Wedding Chat Tool\
│
├── backend/                          # Python/FastAPI Backend
│   ├── api/                          # API Layer
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── chat.py               # POST /start, /message, GET /history
│   │       ├── wedding.py            # CRUD for weddings, events, accommodations, FAQs
│   │       ├── scrape.py             # POST /scrape, /import
│   │       └── health.py             # GET /health
│   │
│   ├── core/                         # Core Infrastructure
│   │   ├── __init__.py
│   │   ├── config.py                 # Pydantic settings from .env
│   │   └── database.py               # SQLAlchemy async setup
│   │
│   ├── models/                       # Database Models (SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── wedding.py                # Wedding, WeddingEvent, WeddingAccommodation, WeddingFAQ
│   │   ├── chat.py                   # ChatSession, ChatMessage
│   │   └── user.py                   # User (for couple authentication)
│   │
│   ├── services/                     # Business Logic
│   │   ├── __init__.py
│   │   ├── chat/
│   │   │   ├── __init__.py
│   │   │   └── chat_engine.py        # Claude-powered Q&A engine
│   │   └── scraper/
│   │       ├── __init__.py
│   │       ├── scraper.py            # Multi-page scraper with tiered fallback
│   │       ├── browser_fetch.py      # Playwright stealth wrapper (added Dec 29)
│   │       └── data_mapper.py        # Claude-powered data extraction
│   │
│   ├── main.py                       # FastAPI app entry point
│   ├── requirements.txt              # Python dependencies
│   ├── test_setup.py                 # Setup verification script
│   ├── .env.example                  # Environment template
│   ├── claude_responses.txt          # Debug log for Claude API requests
│   └── wedding_chat.db               # SQLite database (auto-created)
│
├── frontend/                         # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page with chat
│   │   │   ├── import/
│   │   │   │   └── page.tsx          # Import page with progress bar
│   │   │   ├── layout.tsx            # Root layout
│   │   │   └── globals.css           # Global styles
│   │   ├── components/
│   │   │   └── chat/
│   │   │       └── ChatWidget.tsx    # Interactive chat component
│   │   └── lib/
│   │       └── api.ts                # API client (includes scrape functions)
│   ├── .env.local                    # Frontend env vars
│   ├── package.json
│   └── tailwind.config.ts
│
├── docs/                             # Documentation
│   └── session-notes/
│       ├── SESSION_PROMPT_WEDDING.md
│       ├── SESSION_LOG_WEDDING.md
│       └── CLAUDE_CONTEXT_WEDDING.md (this file)
│
└── README.md                         # Project overview
```

**Note:** `browser_fetch.py` was deleted Dec 25, re-created Dec 29 with Playwright stealth for anti-bot bypass.

---

## Scraper System Architecture

### Overview
The scraper system fetches wedding websites, extracts content from multiple pages, and uses Claude AI to intelligently map unstructured text to structured wedding data. **As of Dec 29, 2024**, the scraper uses Playwright stealth to bypass anti-bot protection on sites like The Knot.

### Components

#### 1. WeddingScraper (`scraper.py`)
- Fetches main page and subpages (travel, schedule, registry, etc.)
- **Uses tiered fallback: httpx → Playwright stealth** (updated Dec 29, 2024)
- Platform-specific extractors for The Knot, Zola, Joy, WeddingWire
- Key methods:
  - `scrape(url)` - Main entry point
  - `_fetch_page(url)` - Tiered fetch with fallback
  - `_fetch_with_httpx(url)` - Fast httpx fetch
  - `_fetch_with_browser(url)` - Playwright stealth fetch
  - `_should_use_browser(url)` - Check if platform requires browser
  - `_is_blocked_response(html)` - Detect 403/Access Denied
  - `_find_subpages(soup, url)` - Detect navigation links
  - `_get_known_subpages(url, platform)` - Fallback URL patterns
  - `_clean_page_text(text)` - Filter garbage content (icons, cookies)

#### 2. StealthBrowser (`browser_fetch.py`) - NEW Dec 29, 2024
- Playwright-based browser with anti-detection
- Uses `playwright-stealth` package
- Key features:
  - Masks `navigator.webdriver` property
  - Randomizes viewport size (1200-1920 x 800-1080)
  - Sets realistic browser plugins and languages
  - Uses `wait_until="domcontentloaded"` to avoid timeouts
  - Scroll simulation for lazy-loaded content
- Key methods:
  - `start()` - Initialize browser
  - `close()` - Cleanup browser
  - `fetch_page(url)` - Fetch with stealth

#### 3. WeddingDataMapper (`data_mapper.py`)
- Uses Claude to extract structured data from raw text
- Handles: couple names, venues, events, hotels, FAQs
- Character limit: 35000 chars
- Key methods:
  - `extract_structured_data(raw_data)` - Main entry point
  - `_extract_with_claude(full_text)` - Claude API call
  - `_merge_data(direct, llm)` - Combine extraction methods

### Data Flow (Updated Dec 29, 2024)
```
URL → WeddingScraper
      │
      ├── _should_use_browser(url)
      │   └── Returns True for The Knot, WeddingWire
      │
      ├── _fetch_page(url) [TIERED FALLBACK]
      │   ├── If browser required OR session flagged:
      │   │   └── _fetch_with_browser() → StealthBrowser
      │   │
      │   └── Otherwise:
      │       ├── Tier 1: _fetch_with_httpx() [fast]
      │       │   └── If _is_blocked_response() detected
      │       └── Tier 2: _fetch_with_browser() [bypass]
      │
      ├── BeautifulSoup parsing
      │
      ├── _find_subpages() or _get_known_subpages()
      │   └── Returns list of subpage URLs
      │
      ├── Fetch each subpage (reuses browser if needed)
      │
      ├── _clean_page_text()
      │   └── Filters garbage (icons, cookie notices)
      │
      ├── Prioritize content (travel/hotels FIRST)
      │
      └── Platform-specific extraction
          └── Returns raw_data with full_text

raw_data → WeddingDataMapper
           │
           ├── _extract_direct_fields()
           │
           ├── _extract_with_claude()
           │   └── Claude API (35000 char limit)
           │
           └── _merge_data()
               └── Returns structured_data
```

### Browser Required Platforms
```python
BROWSER_REQUIRED_PLATFORMS = {
    "theknot.com": True,      # Akamai CDN protection
    "weddingwire.com": True,  # Same owner as The Knot
}
```

### Blocked Response Detection
Checks for:
- HTTP 403 status
- "Access Denied" in HTML
- "Please enable JavaScript"
- "Checking your browser"
- Very short HTML responses (<500 chars)

### Text Cleaning (`_clean_page_text`)
Added Dec 25, 2024 to filter garbage from scraped content:
- Removes icon names like `virtual_tour`, `photo_camera`
- Strips cookie policy boilerplate
- Filters single numbers and very short strings
- Normalizes whitespace

### Content Prioritization
Travel/accommodation content now appears FIRST in `full_text`:
1. `travel`, `accommodations`, `hotels` pages
2. `q-a`, `faq` pages
3. Other subpages
4. Main page (last - often has most garbage)

### Anti-Detection Techniques (browser_fetch.py)
1. **playwright-stealth package** - Core evasions
2. **navigator.webdriver** - Returns undefined
3. **navigator.plugins** - Non-empty realistic array
4. **navigator.languages** - ['en-US', 'en']
5. **Randomized viewport** - 1200-1920 x 800-1080
6. **Browser args** - `--disable-blink-features=AutomationControlled`
7. **wait_until** - domcontentloaded (faster, avoids timeouts)
8. **Scroll simulation** - Triggers lazy loading

---

## Database Schema

### Core Tables

```sql
-- Main wedding record
CREATE TABLE weddings (
    id VARCHAR(36) PRIMARY KEY,        -- UUID as string
    partner1_name VARCHAR(100) NOT NULL,
    partner2_name VARCHAR(100) NOT NULL,
    couple_email VARCHAR(255) UNIQUE NOT NULL,
    wedding_date DATE,
    wedding_time VARCHAR(50),
    dress_code VARCHAR(100),

    -- Ceremony
    ceremony_venue_name VARCHAR(200),
    ceremony_venue_address TEXT,
    ceremony_venue_url VARCHAR(500),

    -- Reception
    reception_venue_name VARCHAR(200),
    reception_venue_address TEXT,
    reception_venue_url VARCHAR(500),
    reception_time VARCHAR(50),

    -- Links
    registry_urls JSON,                 -- {"amazon": "url", "target": "url"}
    wedding_website_url VARCHAR(500),
    rsvp_url VARCHAR(500),
    additional_notes TEXT,

    -- Scraping
    scraped_data JSON,
    last_scraped_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    access_code VARCHAR(50)             -- Guest access code (e.g., "smith-jones-2025")
);

-- Additional events (rehearsal dinner, brunch, etc.)
CREATE TABLE wedding_events (
    id VARCHAR(36) PRIMARY KEY,
    wedding_id VARCHAR(36) REFERENCES weddings(id) ON DELETE CASCADE,
    event_name VARCHAR(200) NOT NULL,
    event_date DATE,
    event_time VARCHAR(50),
    venue_name VARCHAR(200),
    venue_address TEXT,
    venue_url VARCHAR(500),
    description TEXT,
    dress_code VARCHAR(100)
);

-- Hotels with room blocks
CREATE TABLE wedding_accommodations (
    id VARCHAR(36) PRIMARY KEY,
    wedding_id VARCHAR(36) REFERENCES weddings(id) ON DELETE CASCADE,
    hotel_name VARCHAR(200) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    website_url VARCHAR(500),
    booking_url VARCHAR(500),
    has_room_block BOOLEAN DEFAULT FALSE,
    room_block_name VARCHAR(200),
    room_block_code VARCHAR(100),
    room_block_deadline DATE,
    room_block_rate VARCHAR(100),
    distance_to_venue VARCHAR(100),
    notes TEXT
);

-- FAQs
CREATE TABLE wedding_faqs (
    id VARCHAR(36) PRIMARY KEY,
    wedding_id VARCHAR(36) REFERENCES weddings(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    display_order INTEGER DEFAULT 0
);

-- Chat sessions
CREATE TABLE chat_sessions (
    id VARCHAR(36) PRIMARY KEY,
    wedding_id VARCHAR(36) REFERENCES weddings(id) ON DELETE CASCADE,
    guest_identifier VARCHAR(255) NOT NULL,
    guest_name VARCHAR(100),
    channel VARCHAR(20) DEFAULT 'web',  -- 'web' or 'sms'
    created_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP
);

-- Chat messages
CREATE TABLE chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,          -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User accounts (for couples)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    wedding_id VARCHAR(36) REFERENCES weddings(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);
```

---

## API Endpoints

### Chat API (`/api/chat`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/start` | Start new chat session with access code |
| POST | `/message` | Send message in existing session |
| GET | `/history/{session_id}` | Get chat history |

**Start Chat Request:**
```json
{
  "access_code": "smith-jones-2025",
  "guest_name": "Sarah"
}
```

**Start Chat Response:**
```json
{
  "session_id": "uuid-string",
  "greeting": "Hi there! I'm here to help...",
  "wedding_title": "Alice & Bob's Wedding"
}
```

**Send Message Request:**
```json
{
  "session_id": "uuid-string",
  "message": "What hotel has the room block?"
}
```

**Send Message Response:**
```json
{
  "response": "The Grand Hotel has a room block...",
  "session_id": "uuid-string"
}
```

### Wedding API (`/api/wedding`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new wedding |
| GET | `/{wedding_id}` | Get wedding with all related data |
| PATCH | `/{wedding_id}` | Update wedding details |
| POST | `/{wedding_id}/accommodations` | Add accommodation |
| DELETE | `/{wedding_id}/accommodations/{id}` | Remove accommodation |
| POST | `/{wedding_id}/events` | Add event |
| DELETE | `/{wedding_id}/events/{id}` | Remove event |
| POST | `/{wedding_id}/faqs` | Add FAQ |
| DELETE | `/{wedding_id}/faqs/{id}` | Remove FAQ |

### Scrape API (`/api/scrape`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Scrape wedding website, return preview |
| POST | `/import` | Import scraped data into database |

**Scrape Request:**
```json
{
  "url": "https://www.theknot.com/us/jane-and-john"
}
```

**Scrape Response:**
```json
{
  "success": true,
  "platform": "the_knot",
  "data": { /* full extracted data */ },
  "preview": {
    "partner1_name": "Jane",
    "partner2_name": "John",
    "wedding_date": "2025-06-15",
    "ceremony_venue": "The Grand Chapel",
    "reception_venue": "The Grand Ballroom",
    "events_count": 3,
    "accommodations_count": 2,
    "has_registry": true,
    "dress_code": "Black Tie Optional"
  },
  "message": "Successfully extracted wedding data"
}
```

---

## Chat Engine Flow

```
Guest: "What hotel should I book?"
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  1. ChatEngine.chat() receives message                       │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. build_wedding_context(wedding)                           │
│     - Extracts all wedding info into structured text         │
│     - Includes: dates, venues, hotels, room blocks, FAQs     │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. build_system_prompt(wedding)                             │
│     - Creates system prompt with personality guidelines      │
│     - Embeds wedding context                                 │
│     - Instructions: only use provided info, include links    │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Claude API Call                                          │
│     - Model: claude-sonnet-4-20250514                        │
│     - System: wedding context + personality                  │
│     - Messages: conversation history + new message           │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Response returned to guest                               │
│     "The Grand Hotel has a room block! Use code              │
│      SMITHJONES2025 for $149/night. Book by Dec 15."        │
└─────────────────────────────────────────────────────────────┘
```

---

## Wedding Website Scraper

### Supported Platforms
- The Knot (theknot.com)
- Zola (zola.com)
- WithJoy (withjoy.com)
- Minted (minted.com)
- WeddingWire (weddingwire.com)
- Generic (any website)

### Scraping Flow
```
1. detect_platform(url) → Identifies which platform
2. Fetch main page (httpx with browser-like headers)
3. Parse with BeautifulSoup
4. Find subpages (navigation or known patterns)
5. Fetch each subpage
6. Clean text (remove garbage)
7. Prioritize content (travel first)
8. Platform-specific extraction
9. Send to WeddingDataMapper
10. Claude extracts structured data
11. Return structured data + raw full_text for LLM context
```

### Multi-Page Scraping

1. **Navigation Detection** (`_find_subpages`)
   - Parses HTML for navigation links
   - Looks for common subpage keywords: travel, q-a, schedule, registry, etc.

2. **Known Pattern Fallback** (`_get_known_subpages`)
   - If navigation not detected (JS-rendered), use known URL patterns
   - The Knot: `/travel`, `/q-a`, `/schedule`, `/registry`, etc.
   - Zola: `/travel`, `/faq`, `/schedule`, `/registry`

3. **Content Assembly**
   - Each subpage text stored with page name as key
   - Travel/hotel pages prioritized FIRST
   - Combined into `full_text` with markers: `=== TRAVEL PAGE ===`
   - Sent to Claude for intelligent extraction

---

## Frontend Components

### Import Page with Progress Bar

```
┌─────────────────────────────────────┐
│  [URL Input Screen]                 │  ← Initial state
│  - URL input field                  │
│  - "Scan Website" button            │
└─────────────────────────────────────┘
         │ on submit
         ▼
┌─────────────────────────────────────┐
│  [Scanning with Progress]           │  ← Loading state
│  ┌─────────────────────────────┐   │
│  │ Scanning travel & accom...  │   │
│  │ [████████████░░░░░░░] 55%   │   │
│  │ This may take up to a min..│   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
         │ on success
         ▼
┌─────────────────────────────────────┐
│  [Preview Screen]                   │  ← Review extracted data
│  - Partner names & date             │
│  - Venue info                       │
│  - Event/hotel/registry counts      │
│  - "Create My Wedding Chat" button  │
└─────────────────────────────────────┘
         │ on confirm
         ▼
┌─────────────────────────────────────┐
│  [Success Screen]                   │  ← Show access code & link
│  - Chat link to share               │
│  - Access code                      │
│  - "Try Your Chat Now" button       │
└─────────────────────────────────────┘
```

### Progress Stages
```typescript
const SCAN_STAGES = [
  { progress: 10, message: 'Connecting to website...' },
  { progress: 25, message: 'Loading main page...' },
  { progress: 40, message: 'Finding additional pages...' },
  { progress: 55, message: 'Scanning travel & accommodations...' },
  { progress: 70, message: 'Scanning events & schedule...' },
  { progress: 85, message: 'Extracting wedding details...' },
  { progress: 95, message: 'Almost done...' },
];
```

### ChatWidget Component
```
┌─────────────────────────────────────┐
│  [Access Code Screen]               │  ← Initial state
│  - Access code input                │
│  - Guest name (optional)            │
│  - Start Chat button                │
└─────────────────────────────────────┘
         │ on submit
         ▼
┌─────────────────────────────────────┐
│  [Chat Interface]                   │  ← After connection
│  ┌─────────────────────────────┐   │
│  │ Header: Wedding Title       │   │
│  ├─────────────────────────────┤   │
│  │ Messages Area               │   │
│  │ - Assistant (white bubble)  │   │
│  │ - User (rose bubble)        │   │
│  │ - Loading indicator         │   │
│  ├─────────────────────────────┤   │
│  │ Input: [Type message...] [→]│   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### State Management
- `accessCode` - Wedding access code
- `guestName` - Optional guest name
- `sessionId` - Chat session UUID (from backend)
- `messages` - Array of {role, content}
- `isLoading` - Loading state for API calls
- `error` - Error messages
- `scanProgress` - Progress bar percentage (import page)
- `scanMessage` - Progress stage message (import page)

---

## Configuration

### Backend Environment Variables (`.env`)
```bash
# Database
DATABASE_URL=sqlite+aiosqlite:///./wedding_chat.db  # Dev
# DATABASE_URL=postgresql+asyncpg://user:pass@host/db  # Prod

# Auth
SECRET_KEY=your-secret-key

# LLM
ANTHROPIC_API_KEY=your-anthropic-api-key
LLM_MODEL=claude-sonnet-4-20250514

# Twilio (Phase 2)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### Frontend Environment Variables (`.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Development Roadmap

### Phase 1: MVP (COMPLETE)
- [x] Project structure
- [x] Database models
- [x] Chat engine with Claude
- [x] Wedding CRUD API
- [x] Chat API
- [x] Wedding website scraper
- [x] Chat widget component
- [x] Landing page

### Phase 1.5: Scraper Enhancement (COMPLETE - Dec 29, 2024)
- [x] Multi-page scraping (travel, schedule, etc.)
- [x] Import page with progress bar
- [x] Claude-based intelligent data extraction
- [x] Text cleaning (garbage filtering)
- [x] Travel content prioritization
- [x] **Playwright stealth for anti-bot bypass** (Dec 29)
- [x] **Tiered fallback: httpx → Playwright** (Dec 29)
- [x] **Tested with real The Knot URL - SUCCESS** (Dec 29)

### Phase 2: Deployment & Auth (COMPLETE - Dec 30, 2024)
- [x] GitHub repository setup
- [x] Vercel frontend deployment
- [x] Render backend deployment
- [x] PostgreSQL database (Render)
- [x] Mobile responsive navigation (hamburger menu)
- [x] Branding update (bell hop bell icon)
- [x] Connect frontend to backend
- [ ] **Test registration/login** ← CURRENT STEP

### Phase 3: Dashboard & Polish (NEXT)
- [ ] Test full user flow end-to-end
- [ ] Clean up mobile styling
- [ ] Wedding dashboard UI improvements
- [ ] Import flow testing
- [ ] Chat analytics
- [ ] Multi-language support
- [ ] Custom branding options
- [ ] Email notifications

### Phase 4: SMS Integration
- [ ] Twilio integration
- [ ] SMS webhook handler
- [ ] Phone number provisioning
- [ ] SMS/Web unified history

### Phase 5: Scale & Polish
- [ ] Redis caching
- [ ] Rate limiting
- [ ] Monitoring/logging
- [ ] Custom domains
- [ ] Payment integration

---

## Test Data

### Pre-Created Wedding
- **Access Code:** `alice-bob-test`
- **Couple:** Alice Smith & Bob Jones
- **Email:** alice.bob@test.com
- **Dress Code:** Formal Attire
- **Ceremony:** The Grand Chapel, 123 Wedding Lane, Love City, CA 90210
- **Reception:** The Grand Ballroom (same address), 6:00 PM
- **Hotel:** The Grand Hotel
  - Room Block: SMITHJONES2025
  - Rate: $149/night
  - Address: 456 Hotel Blvd, Love City, CA 90210
  - Phone: (555) 123-4567

---

## Key Design Decisions

### Why SQLite for Development?
- No external database setup required
- Instant project onboarding
- Will migrate to PostgreSQL for production
- Same SQLAlchemy models work with both

### Why String UUIDs Instead of Native UUIDs?
- SQLite doesn't have native UUID type
- String(36) works across all databases
- Simpler migrations and testing

### Why Eager Loading for Relationships?
- Async SQLAlchemy requires explicit relationship loading
- Using `selectinload()` prevents lazy loading errors
- All relationship access must happen within session context

### Why Claude Over Other LLMs?
- Excellent at following structured instructions
- Good at extracting relevant info from context
- Natural conversational tone
- Consistent formatting of responses

### Why Remove Playwright? (Dec 25, 2024)
- Playwright caused complexity with subprocess management
- httpx with browser-like headers works for many sites
- Reduces dependencies and speeds up scraping
- Can add back selectively if JavaScript rendering is needed

**Update (Dec 29):** Playwright was re-added with stealth for anti-bot bypass on The Knot/WeddingWire.

---

## Deployment Configuration (Dec 30, 2024)

### Vercel (Frontend)
- **Framework:** Next.js (auto-detected)
- **Build Command:** `cd frontend && npm install && npm run build`
- **Output Directory:** `frontend/.next`
- **Environment Variable:** `NEXT_PUBLIC_API_URL` = `https://wedding-concierge-api.onrender.com`

### Render (Backend)
- **Runtime:** Python 3
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
- **Root Directory:** `backend`
- **Environment Variables:**
  - `DATABASE_URL` - Auto-provided by Render PostgreSQL
  - `ANTHROPIC_API_KEY` - Claude API key
  - `SECRET_KEY` - JWT signing key

### Render (PostgreSQL)
- Auto-managed by Render
- Connected to backend via internal URL
- Free tier: 256MB storage, 90-day retention

### Important: Free Tier Limitations
- **Render cold starts:** Server sleeps after 15 min inactivity, first request takes ~30 seconds
- **Render PostgreSQL:** 90-day data retention on free tier

---

## Branding (Dec 30, 2024)

### Logo: Bell Hop Bell (Concierge Service Bell)
The app uses a custom SVG concierge bell icon positioned to the RIGHT of "The Wedding Concierge" text.

**SVG Structure:**
- Dome (main bell body)
- Button on top (circular)
- Stem (connecting dome to base)
- Base (rectangular with rounded corners)

**Color:** `text-rose-500` (Tailwind pink/rose)

**Files using the bell icon:**
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Footer.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/register/page.tsx`

---

## Mobile Responsive Navigation (Dec 30, 2024)

### Hamburger Menu Implementation
The Header component includes a mobile-responsive hamburger menu.

**Key Features:**
- `useState` hook for `mobileMenuOpen` toggle
- Hamburger button visible on mobile (`md:hidden`)
- Desktop nav hidden on mobile (`hidden md:flex`)
- X icon when menu is open (close button)
- Menu closes automatically on link click

**Mobile Menu Contents:**
- Home, Pricing, Import links
- Divider
- Dashboard (when logged in)
- Sign In/Get Started or Sign Out buttons

---

## Common Issues & Solutions

### "greenlet_spawn has not been called"
**Cause:** Accessing relationship attributes outside async session
**Fix:** Use `selectinload()` and access relationships within session context

### Chat returns "having trouble" message
**Cause:** Anthropic API key not configured
**Fix:** Set `ANTHROPIC_API_KEY` in `backend/.env`

### CORS errors in browser
**Cause:** Frontend/backend URL mismatch
**Fix:** Ensure `NEXT_PUBLIC_API_URL` matches backend URL

### Database tables not created
**Cause:** Models not imported before `create_all()`
**Fix:** Import models in `init_db()` function

### Hotel data not extracted
**Cause:** Main page garbage filling character limit (FIXED Dec 25)
**Fix:** Text cleaning + travel content prioritization now implemented

### Scraper gets 403 error
**Cause:** Site blocking httpx requests (e.g., Akamai CDN on The Knot)
**Fix (Dec 29):** Playwright stealth fallback now automatically bypasses 403 blocks
**Platforms with auto-browser:** The Knot, WeddingWire

### Scraper returns empty content for JS-heavy sites
**Cause:** Site requires JavaScript to render content
**Fix (Dec 29):** Playwright stealth automatically used for known JS-heavy platforms
**If new platform blocks:** Add to `BROWSER_REQUIRED_PLATFORMS` dict in scraper.py

### Server port conflict (port 8000 stuck)
**Cause:** Old server processes not properly terminated
**Workaround:** Use port 8002 instead
**Fix:** Restart computer to clear stuck processes
