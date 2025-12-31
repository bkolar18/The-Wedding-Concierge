# Session Log - Wedding Chat Tool

**Project:** Wedding Chat Tool
**Repository:** `C:\Users\brenn\Documents\Coding Projects\Wedding Chat Tool\`
**GitHub:** https://github.com/bkolar18/The-Wedding-Concierge.git

---

## Session: December 30, 2024 - Full Deployment (Vercel + Render) & Mobile Responsive

### Summary
Major deployment session! Deployed the frontend to Vercel and backend to Render with PostgreSQL. Added mobile-responsive hamburger menu, updated branding to bell hop bell icon, and connected frontend to backend. The app is now publicly accessible at https://the-wedding-concierge.vercel.app.

### What We Accomplished

#### 1. Branding Updates - Bell Hop Bell Icon
**Files Modified:**
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Footer.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/register/page.tsx`

Changes:
- Changed from ring SVG to concierge service bell (bell hop bell)
- Bell icon positioned to the RIGHT of "The Wedding Concierge" text
- SVG includes: dome, button on top, stem, and base
- Consistent across all pages

#### 2. GitHub Repository Setup
- Initialized git repository
- Created comprehensive `.gitignore` (Python, Node, env files, etc.)
- Removed nested `.git` folder in frontend directory
- Pushed to: https://github.com/bkolar18/The-Wedding-Concierge.git

#### 3. Vercel Frontend Deployment
**File Created:** `vercel.json` (repo root)
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "installCommand": "cd frontend && npm install"
}
```

Issues Fixed:
- "No framework detected" error
- Wrong repository connected (underscores vs dashes in URL)
- 404 errors due to missing build configuration
- Root directory setting clarification

**Live URL:** https://the-wedding-concierge.vercel.app

#### 4. Mobile Responsive Navigation
**File Modified:** `frontend/src/components/Header.tsx`

Added hamburger menu for mobile:
- `useState` for `mobileMenuOpen` toggle
- Hamburger button visible on `md:hidden`
- Desktop nav hidden on mobile (`hidden md:flex`)
- Mobile dropdown with:
  - Home, Pricing, Import links
  - Dashboard (when logged in)
  - Sign In/Get Started or Sign Out buttons
- Menu closes on link click

#### 5. Render Backend Deployment
**Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
**Root Directory:** `backend`

Multiple deployment errors fixed:

**Error 1: Port argument**
- Problem: `$PORT` not expanding in start command
- Fix: Hardcoded port 10000

**Error 2: psycopg2 missing**
- Problem: `ModuleNotFoundError: No module named 'psycopg2'`
- Fix: Added to `requirements.txt`:
  - `asyncpg`
  - `psycopg2-binary`

**Error 3: DATABASE_URL format**
- Problem: Render provides `postgres://` but asyncpg needs `postgresql+asyncpg://`
- Fix: Added `get_database_url()` function in `core/database.py`:
```python
def get_database_url() -> str:
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url
```

**Error 4: Wedding import missing**
- Problem: `NameError: name 'Wedding' is not defined` in chat_engine.py
- Fix: Added TYPE_CHECKING import:
```python
from typing import ..., TYPE_CHECKING

if TYPE_CHECKING:
    from models.wedding import Wedding
```
- Changed type hint to string annotation: `wedding: "Wedding"`

**Error 5: email-validator missing**
- Problem: `ImportError: email-validator is not installed`
- Fix: Added to `requirements.txt`:
  - `pydantic[email]` (replaces plain `pydantic`)
  - `email-validator`

**Live URL:** https://wedding-concierge-api.onrender.com/

#### 6. Connected Frontend to Backend
- Added environment variable in Vercel:
  - `NEXT_PUBLIC_API_URL` = `https://wedding-concierge-api.onrender.com`
- Redeployed frontend
- Authentication flow now connected

### Files Created This Session
| File | Purpose |
|------|---------|
| `vercel.json` | Vercel build configuration |
| `.gitignore` | Git ignore rules |

### Files Modified This Session
| File | Changes |
|------|---------|
| `frontend/src/components/Header.tsx` | Bell icon + hamburger mobile menu |
| `frontend/src/components/Footer.tsx` | Bell icon |
| `frontend/src/app/login/page.tsx` | Bell icon |
| `frontend/src/app/register/page.tsx` | Bell icon |
| `backend/requirements.txt` | PostgreSQL drivers, email-validator |
| `backend/core/database.py` | DATABASE_URL format conversion |
| `backend/services/chat/chat_engine.py` | TYPE_CHECKING import fix |

### Environment Variables Set

**Render (Backend):**
- `DATABASE_URL` - Auto-provided by Render PostgreSQL
- `ANTHROPIC_API_KEY` - Claude API key
- `SECRET_KEY` - JWT signing key (`xK9#mP2vL5nQ8@wR3jT6yU0bN4cF7hA`)

**Vercel (Frontend):**
- `NEXT_PUBLIC_API_URL` = `https://wedding-concierge-api.onrender.com`

### Current Deployment Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     VERCEL      │  │     RENDER      │  │     RENDER      │
│   (Frontend)    │  │   (Backend)     │  │  (PostgreSQL)   │
│                 │  │                 │  │                 │
│  Next.js App    │  │  FastAPI App    │  │   Database      │
│                 │──│                 │──│                 │
│ the-wedding-    │  │ wedding-        │  │  Auto-managed   │
│ concierge.      │  │ concierge-api.  │  │                 │
│ vercel.app      │  │ onrender.com    │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Important Notes

**Render Free Tier Cold Starts:**
- Server sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- This is normal for free tier

**Local Development Still Works:**
- Backend: `uvicorn main:app --port 8000`
- Frontend: `npm run dev`
- Local URLs: localhost:3000 (frontend), localhost:8000 (backend)

### Next Steps (for next session)
1. **Test registration/login** on live site
2. **Clean up mobile styling** (user mentioned)
3. **Test wedding import flow** end-to-end
4. **Test chat functionality** with imported wedding

---

## Session: December 29, 2024 - Playwright Stealth Implementation & Scraper Working

### Summary
Re-implemented Playwright with stealth anti-detection to bypass The Knot's Akamai bot protection. The httpx-only scraper was getting 403 Access Denied errors. After implementing Playwright stealth with tiered fallback, the scraper now successfully extracts all wedding data including events, accommodations, venues, and registry info.

### What We Accomplished

#### 1. Diagnosed The Knot Blocking Issue
- httpx requests to The Knot returned 403 Access Denied
- Root cause: Akamai CDN with aggressive bot protection
- Solution: Use Playwright with stealth techniques to appear as a real browser

#### 2. Created browser_fetch.py (NEW FILE)
**File:** `backend/services/scraper/browser_fetch.py`

Implemented `StealthBrowser` class with anti-detection techniques:
- Uses `playwright-stealth` package for core evasions
- Masks `navigator.webdriver` property
- Sets realistic `navigator.plugins` (non-empty)
- Randomizes viewport size (1200-1920 x 800-1080)
- Adds realistic browser languages
- Uses `wait_until="domcontentloaded"` to avoid timeouts
- Includes scroll simulation for lazy-loaded content

Key methods:
- `start()` - Initialize browser with stealth config
- `close()` - Cleanup browser instance
- `fetch_page(url)` - Fetch with stealth, return HTML
- `fetch_with_browser(url)` - Convenience function for one-off fetches

#### 3. Updated scraper.py with Tiered Fallback
**File:** `backend/services/scraper/scraper.py`

Added new architecture:
```python
BROWSER_REQUIRED_PLATFORMS = {
    "theknot.com": True,      # Akamai protection
    "weddingwire.com": True,  # Same owner as The Knot
}
```

New methods:
- `_should_use_browser(url)` - Check if platform requires Playwright
- `_is_blocked_response(html)` - Detect 403/Access Denied
- `_fetch_with_httpx(url)` - Original httpx fetch logic
- `_fetch_with_browser(url)` - Playwright stealth fetch

Updated `_fetch_page()` flow:
1. If platform known to require browser → use Playwright directly
2. Otherwise try httpx first (fast)
3. If blocked (403/Access Denied) → fallback to Playwright
4. Track `_use_browser_for_session` to use browser for all subpages once triggered

#### 4. Fixed config.py for Absolute .env Path
**File:** `backend/core/config.py`

**Problem:** Settings weren't loading the .env file when run from different directories.

**Fix:** Changed from relative to absolute path:
```python
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    class Config:
        env_file = str(ENV_FILE)  # Now absolute path
```

#### 5. Added Dependencies
**File:** `backend/requirements.txt`
```
playwright
playwright-stealth
```

**Also ran:**
```bash
playwright install chromium
```

#### 6. Successful Test with The Knot
**URL Tested:** `https://www.theknot.com/us/hannah-nichols-and-parker-howell-nov-2017-40c0b85c-bbe8-49ff-8ebe-5691fee8df54`

**Results:**
- Partner names: Hannah & Parker
- Wedding date: 2017-11-11
- Time: 4:00 PM
- Dress code: Formal
- Ceremony venue: Lesner Inn, 3319 Shore Drive, Virginia Beach, VA
- Reception venue: Lesner Inn (same)
- Events: 1 (After-Party at Commonwealth Brewing Company, 9:00 PM)
- Accommodations: 2
  - Virginia Beach Resort Hotel ($89/night, room block)
  - Wyndham Virginia Beach Oceanfront

### Issues Encountered

#### Port Conflict
- Old server processes were stuck on port 8000
- Could not kill them via taskkill
- **Workaround:** Started working server on port 8002
- **Resolution needed:** Restart computer to clear port 8000, or update frontend to use 8002

### Files Created This Session
| File | Lines | Purpose |
|------|-------|---------|
| `backend/services/scraper/browser_fetch.py` | ~180 | Playwright stealth wrapper |

### Files Modified This Session
| File | Changes |
|------|---------|
| `backend/services/scraper/scraper.py` | Added tiered fallback, BROWSER_REQUIRED_PLATFORMS, new methods |
| `backend/core/config.py` | Absolute path for .env file |
| `backend/requirements.txt` | Added playwright, playwright-stealth |
| `backend/services/scraper/data_mapper.py` | Added debug logging for API key |

### Current Scraper Architecture

```
URL → WeddingScraper
      │
      ├── _should_use_browser(url)
      │   └── Returns True for The Knot, WeddingWire
      │
      ├── _fetch_page(url) [TIERED FALLBACK]
      │   ├── If browser required or session needs browser:
      │   │   └── _fetch_with_browser() → StealthBrowser
      │   │
      │   └── Otherwise:
      │       ├── Tier 1: _fetch_with_httpx() [fast]
      │       │   └── If blocked (_is_blocked_response)
      │       └── Tier 2: _fetch_with_browser() [bypass]
      │
      ├── BeautifulSoup parsing
      ├── _find_subpages() or _get_known_subpages()
      ├── Fetch each subpage (reuses browser if needed)
      ├── _clean_page_text() - Filter garbage
      ├── Prioritize content (travel first)
      └── Platform-specific extraction
          └── Returns raw_data with full_text

raw_data → WeddingDataMapper
           │
           ├── _extract_direct_fields()
           │
           ├── _extract_with_claude()
           │   └── Claude API call (35000 char limit)
           │
           └── _merge_data()
               └── Returns structured_data
```

### Anti-Detection Techniques Implemented

1. **playwright-stealth package** - Core evasions for webdriver detection
2. **navigator.webdriver masking** - Returns undefined
3. **navigator.plugins** - Non-empty array with realistic plugins
4. **navigator.languages** - ['en-US', 'en']
5. **Randomized viewport** - 1200-1920 width, 800-1080 height
6. **Browser arguments** - `--disable-blink-features=AutomationControlled`
7. **wait_until="domcontentloaded"** - Faster than networkidle, avoids timeouts
8. **Scroll simulation** - Triggers lazy-loaded content

---

## Session: December 25, 2024 - Scraper Simplification & Hotel Fix Completion

### Summary
Completed the hotel data extraction fix by implementing text cleaning and travel content prioritization. Then significantly simplified the scraper by removing the Playwright dependency entirely, making the codebase lighter and faster.

### What We Accomplished

#### 1. Completed Hotel Data Fix (Steps 2-3)

**Added `_clean_page_text()` method** (scraper.py lines 316-336)
- Filters garbage text like icon names (`virtual_tour`, `photo_camera`)
- Removes cookie policy boilerplate
- Strips single numbers and very short strings
- Normalizes whitespace

**Prioritized travel subpage content** (scraper.py lines 470-485)
- Travel/accommodation pages now appear FIRST in `full_text`
- Priority order: `travel`, `accommodations`, `hotels`, `q-a`, `faq`
- Other pages added after priority pages
- Main page content added last (was filling limit with garbage)

#### 2. Removed Playwright Dependency Entirely

**Deleted Files:**
- `backend/services/scraper/browser_fetch.py` - Playwright subprocess script

**Modified scraper.py:**
- Removed imports: `asyncio`, `subprocess`, `sys`, `os`, `ThreadPoolExecutor`
- Removed `_executor` and `_browser_script` initialization
- Deleted `_fetch_with_browser_sync()` method
- Deleted `_fetch_with_playwright()` method
- Simplified `_fetch_page()` to use only httpx
- Removed `force_browser` parameter from all calls
- Removed JS-heavy platform detection logic

**Why Remove Playwright?**
- Playwright was causing complexity with subprocess management
- httpx with browser-like headers works for many sites
- If JavaScript rendering is needed later, can add back selectively
- Reduces dependencies and speeds up scraping

#### 3. Verified Everything Works
- Scraper module imports correctly
- Scrape route imports correctly
- Main app starts with all 27 routes registered
- No Playwright in requirements.txt (was manually installed)

### Files Modified This Session

| File | Changes |
|------|---------|
| `backend/services/scraper/scraper.py` | Added `_clean_page_text()`, prioritized travel content, removed all Playwright code (~50 lines removed) |

### Files Deleted This Session

| File | Reason |
|------|--------|
| `backend/services/scraper/browser_fetch.py` | Playwright no longer used |

### Code Changes Detail

**scraper.py - Imports simplified:**
```python
# Before (12 imports)
import re, json, asyncio, subprocess, sys, os, logging
from concurrent.futures import ThreadPoolExecutor
import httpx
from bs4 import BeautifulSoup

# After (7 imports)
import re, json, logging
import httpx
from bs4 import BeautifulSoup
```

**scraper.py - `_fetch_page()` simplified:**
```python
# Before: 25 lines with Playwright fallback
# After: 20 lines, httpx only

async def _fetch_page(self, url: str) -> Optional[str]:
    try:
        logger.info(f"Fetching: {url}")
        response = await self.client.get(url)
        response.raise_for_status()
        return response.text
    except httpx.HTTPStatusError as e:
        logger.warning(f"HTTP error {e.response.status_code} for {url}")
        if e.response.status_code == 403:
            if e.response.text:
                return e.response.text
        return None
    except httpx.HTTPError as e:
        logger.warning(f"HTTP error fetching {url}: {e}")
        return None
```

### Current Scraper Architecture

```
URL → WeddingScraper
      │
      ├── _fetch_page() [httpx only]
      │   └── Returns HTML or None
      │
      ├── BeautifulSoup parsing
      │
      ├── _find_subpages() or _get_known_subpages()
      │   └── Returns list of subpage URLs
      │
      ├── Fetch each subpage
      │
      ├── _clean_page_text()
      │   └── Filters garbage content
      │
      ├── Prioritize content (travel first)
      │
      └── Platform-specific extraction
          └── Returns raw_data with full_text

raw_data → WeddingDataMapper
           │
           ├── _extract_direct_fields()
           │
           ├── _extract_with_claude()
           │   └── Claude API call (35000 char limit)
           │
           └── _merge_data()
               └── Returns structured_data
```

### Dependencies Status

**requirements.txt (unchanged):**
```
# Web Scraping
beautifulsoup4
httpx
```
**Note:** Playwright was installed separately, not in requirements.txt. It can be safely uninstalled from the venv.

---

## Session: December 24, 2024 (Evening) - Scraper Enhancement & Hotel Data Fix

### Summary
Extended the wedding website scraper with multi-page support, Playwright browser automation, and intelligent Claude-based data extraction. Added a progress bar to the import page. Diagnosed and partially fixed hotel data extraction issues.

### What We Accomplished

#### 1. Multi-Page Scraping System
Created a comprehensive multi-page scraping system that fetches subpages (travel, schedule, registry, etc.) from wedding websites.

**Files Created/Modified:**
- `backend/services/scraper/scraper.py` - Added multi-page scraping logic
  - `_find_subpages()` method to detect navigation links (line 124)
  - `_get_known_subpages()` fallback for JS-rendered navigation (line 171)
  - Diagnostic logging for subpage content (lines 249-253)

- `backend/services/scraper/browser_fetch.py` - NEW FILE (later deleted Dec 25)
  - Playwright subprocess for fetching JS-heavy pages
  - Runs as separate process to avoid async conflicts
  - Uses `domcontentloaded` wait strategy (faster than `networkidle`)

- `backend/services/scraper/data_mapper.py` - NEW FILE (~290 lines)
  - `WeddingDataMapper` class for intelligent extraction
  - Uses Claude to parse unstructured text into structured data
  - Extracts: couple names, venues, events, hotels, FAQs
  - Increased char limit to 35000 (line 164)
  - Enhanced prompt for hotel extraction (lines 174-238)
  - Diagnostic logging (lines 169-172, 255-259)

#### 2. Import Page with Progress Bar
Added animated progress bar to show users the scraping status.

**File Modified:** `frontend/src/app/import/page.tsx`
- Added `SCAN_STAGES` constant with 7 progress stages (lines 10-18)
- Added `scanProgress` and `scanMessage` state (lines 29-30)
- Added progress bar UI with gradient animation (lines 153-168)
- Progress updates every 8 seconds during scan

#### 3. Scraping API Endpoints
**File Created:** `backend/api/routes/scrape.py`
- `POST /api/scrape/` - Scrape and preview wedding website
- `POST /api/scrape/import` - Import scraped data into database
- Uses `WeddingDataMapper` for intelligent extraction

#### 4. Timeout & Performance Fixes
- Changed Playwright wait strategy from `networkidle` to `domcontentloaded`
- Increased subprocess timeout to 120 seconds
- Force browser mode for known JS-heavy platforms (The Knot, Zola, Joy, WeddingWire)

### Issues Diagnosed

#### Hotel Data Not Extracting
**Problem:** Travel page is being scraped but hotel data isn't reaching Claude.

**Root Cause Analysis:**
1. Main page content is 90% garbage (icon names like `virtual_tour`, cookie policy)
2. This garbage fills the 35000 character limit
3. Travel subpage content gets truncated or pushed out
4. `travel_info` field was showing wrong content (registry items)

**Fix Plan Created (6 Steps):**
| Step | Description | Status |
|------|-------------|--------|
| 1 | Add diagnostic logging to scraper.py | Done (Dec 24) |
| 2 | Add `_clean_page_text()` to filter garbage | Done (Dec 25) |
| 3 | Prioritize travel subpage in `full_text` | Done (Dec 25) |
| 4 | Increase data_mapper limit to 35000 | Done (Dec 24) |
| 5 | Improve Claude prompt for hotel extraction | Done (Dec 24) |
| 6 | Add logging to data_mapper.py | Done (Dec 24) |

### Files Created Dec 24

| File | Lines | Purpose |
|------|-------|---------|
| `backend/services/scraper/browser_fetch.py` | ~50 | Playwright subprocess (deleted Dec 25) |
| `backend/services/scraper/data_mapper.py` | ~290 | Claude data extraction |
| `backend/api/routes/scrape.py` | ~180 | Scraping API endpoints |

### Files Modified Dec 24

| File | Changes |
|------|---------|
| `backend/services/scraper/scraper.py` | Multi-page scraping, subpage detection, diagnostic logging |
| `backend/main.py` | Added scrape router import |
| `frontend/src/app/import/page.tsx` | Progress bar with stages |
| `frontend/src/lib/api.ts` | Added scrape/import API functions |

---

## Session: December 24, 2024 (Morning) - Initial MVP Build

### Summary
Built complete MVP of Wedding Chat Tool from scratch - an AI-powered chat assistant for wedding guests. Full-stack application with Python/FastAPI backend and Next.js frontend, integrated with Claude for natural language Q&A.

### Duration
Single session - Project inception to working MVP

### What We Built

#### Backend (Python/FastAPI)
| Component | Files Created | Lines | Status |
|-----------|---------------|-------|--------|
| Core Config | `core/config.py`, `core/database.py` | ~80 | Complete |
| Wedding Models | `models/wedding.py` | ~160 | Complete |
| Chat Models | `models/chat.py` | ~80 | Complete |
| User Models | `models/user.py` | ~40 | Complete |
| Chat Engine | `services/chat/chat_engine.py` | ~180 | Complete |
| Scraper | `services/scraper/scraper.py` | ~200 | Complete |
| Chat API | `api/routes/chat.py` | ~200 | Complete |
| Wedding API | `api/routes/wedding.py` | ~400 | Complete |
| Main App | `main.py` | ~50 | Complete |

**Total Backend:** ~1,400 lines of code

#### Frontend (Next.js/TypeScript)
| Component | Files Created | Lines | Status |
|-----------|---------------|-------|--------|
| Landing Page | `src/app/page.tsx` | ~30 | Complete |
| Chat Widget | `src/components/chat/ChatWidget.tsx` | ~180 | Complete |
| API Client | `src/lib/api.ts` | ~70 | Complete |
| Styling | `src/app/globals.css`, `layout.tsx` | ~50 | Complete |

**Total Frontend:** ~330 lines of code

#### Documentation
| File | Purpose |
|------|---------|
| `README.md` | Project overview & setup instructions |
| `SESSION_PROMPT_WEDDING.md` | Session start guide |
| `SESSION_LOG_WEDDING.md` | This file - work log |
| `CLAUDE_CONTEXT_WEDDING.md` | Full architecture reference |

### Key Decisions Made

1. **Hybrid Tech Stack**
   - Next.js for frontend (embeddable widgets, Vercel deployment)
   - Python/FastAPI for backend (superior scraping & LLM integration)

2. **SQLite for Development**
   - No external DB setup required
   - Will migrate to PostgreSQL for production
   - Uses string UUIDs for cross-database compatibility

3. **Access Code System**
   - Simple guest access without authentication
   - Auto-generated from couple names (e.g., "alice-bob-2025")
   - Can be customized by couples

4. **Claude for Chat**
   - Model: claude-sonnet-4-20250514
   - System prompt embeds all wedding context
   - Natural conversational responses

### Testing Completed

1. **Setup Test Script** (`test_setup.py`)
   - All imports successful
   - Database tables created
   - Test wedding created with accommodation
   - Chat engine context building works
   - FastAPI app loads correctly

2. **Server Verification**
   - Backend running on http://localhost:8000
   - Frontend running on http://localhost:3000
   - API docs available at http://localhost:8000/docs

### Test Data Created

```
Wedding: Alice Smith & Bob Jones
Access Code: alice-bob-test
Email: alice.bob@test.com

Ceremony: The Grand Chapel
Reception: The Grand Ballroom
Time: 4:00 PM ceremony, 6:00 PM reception
Dress Code: Formal Attire

Hotel: The Grand Hotel
  - Room Block Code: SMITHJONES2025
  - Rate: $149/night
  - Phone: (555) 123-4567
```

### Issues Encountered & Resolved

1. **Rust Compilation Error**
   - Problem: `asyncpg` and `pydantic-core` required Rust compiler
   - Solution: Switched to `aiosqlite` for database, used pre-built wheels

2. **SQLAlchemy Async Relationship Loading**
   - Problem: "greenlet_spawn has not been called" error
   - Solution: Use `selectinload()` and access relationships within session context

3. **PostgreSQL UUID Type**
   - Problem: SQLite doesn't support PostgreSQL UUID type
   - Solution: Changed to String(36) primary keys with UUID generation

4. **Playwright Timeout (60 seconds)**
   - Problem: `networkidle` wait strategy too slow
   - Solution: Changed to `domcontentloaded` wait strategy

### Dependencies Installed

```
# Backend (requirements.txt)
fastapi, uvicorn[standard], python-multipart
sqlalchemy, alembic, aiosqlite
anthropic
beautifulsoup4, httpx
pydantic, pydantic-settings, python-dotenv
python-jose[cryptography], passlib[bcrypt]
python-dateutil

# Note: playwright was installed manually, not in requirements.txt
# It has been removed as of Dec 25

# Frontend (package.json - via create-next-app)
next, react, react-dom
typescript, tailwindcss, eslint
```

---

## Roadmap & Next Steps

### Immediate (Next Session)
1. **Test scraper with real wedding URL** - Verify hotel extraction works
2. If needed, add back Playwright for specific platforms only
3. Consider cloud scraping service as alternative

### Short-Term (Phase 2)
1. **User Authentication**
   - JWT-based auth for couples
   - Registration/login flows
   - Password reset

2. **Couple Dashboard**
   - Wedding info management UI
   - Add/edit venues, hotels, events, FAQs
   - Scraper integration (paste URL -> auto-fill)
   - Preview chat as guest

### Medium-Term (Phase 3)
1. Chat analytics (popular questions, usage stats)
2. Embeddable widget for external sites
3. Custom branding/themes
4. Multi-language support

### Long-Term (Phase 4+)
1. SMS integration (Twilio)
2. PostgreSQL migration
3. Production deployment
4. Payment integration
5. Wedding planner accounts

---

## Session Statistics

| Metric | Value |
|--------|-------|
| Files Created | 30+ |
| Lines of Code | ~2,500 |
| Database Tables | 6 |
| API Endpoints | 27 |
| Time to MVP | 2 sessions |

---

## Notes for Next Session

1. **First Priority:** Test scraper with real wedding URL
2. **Check:** Server logs for "Claude extracted: X accommodations"
3. **If JS needed:** Consider adding Playwright back for specific platforms
4. **Servers:** Backend on 8000, Frontend on 3000
5. **Docs Location:** `docs/session-notes/`

### Commands to Start Development
```bash
# Terminal 1 - Backend
cd "C:\Users\brenn\Documents\Coding Projects\Wedding Chat Tool\backend"
"venv\Scripts\python.exe" -B -m uvicorn main:app --port 8000 --reload

# Terminal 2 - Frontend
cd "C:\Users\brenn\Documents\Coding Projects\Wedding Chat Tool\frontend"
npm run dev
```

---

## Change Log

### v0.3.0 (December 25, 2024)
- Completed hotel data fix (text cleaning, travel prioritization)
- Removed Playwright dependency entirely
- Deleted browser_fetch.py
- Simplified scraper to use only httpx + BeautifulSoup
- Ready for real-world testing

### v0.2.0 (December 24, 2024 - Evening)
- Multi-page scraping for wedding subpages
- Playwright browser automation
- Claude-based intelligent data extraction
- Import page with progress bar
- Diagnostic logging for debugging
- Hotel extraction fix (partial - 4/6 steps complete)

### v0.1.0 (December 24, 2024 - Morning)
- Initial MVP release
- Full backend with FastAPI
- Chat widget with Next.js
- Claude integration for Q&A
- Wedding website scraper
- SQLite database
- Test wedding with sample data
