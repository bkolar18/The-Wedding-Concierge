# Session Log - Wedding Chat Tool

**Project:** Wedding Chat Tool
**Repository:** `C:\Users\brenn\Documents\Coding Projects\Wedding Chat Tool\`
**GitHub:** https://github.com/bkolar18/The-Wedding-Concierge.git

---

## Session: January 6, 2026 - Feature Review & Documentation

### Summary
Completed guest chat usage tracking analytics and created comprehensive feature inventory documentation. The app is now feature-complete and ready for user acquisition. Documented all 40+ API endpoints, 10 pages, and 8 major components.

### What We Accomplished

#### 1. Guest Chat Usage Tracking Analytics
Added tracking for "Number of Guests who have used the chat" as requested by user.

**Files Modified:**
- `backend/models/sms.py` - Added `has_used_chat` (Boolean) and `first_chat_at` (DateTime) fields to Guest model
- `backend/api/routes/public.py` - Set `has_used_chat=true` when guests register or return via chat
- `backend/core/database.py` - Added auto-migration for new columns
- `backend/api/routes/analytics.py` - Added `guests_who_used_chat` and `total_guests` to response
- `backend/api/routes/digest.py` - Include engagement stats in weekly digest
- `backend/services/email/email_service.py` - Added "Guest Chat Engagement" section to email
- `frontend/src/lib/api.ts` - Updated AnalyticsData interface
- `frontend/src/components/AnalyticsDashboard.tsx` - Added teal/emerald gradient engagement card

**New Dashboard Card:**
- Shows "X / Y" guests who have used chat
- Displays percentage engagement
- Visual progress bar

#### 2. Comprehensive Feature Inventory Documentation
Created `docs/FEATURE_INVENTORY.md` (~500 lines) documenting:

- **10 Feature Categories** with descriptions
- **40+ API Endpoints** organized by route file
- **10 Frontend Pages** with purposes
- **8 Major Components** with functionality
- **6 Backend Services** with descriptions
- **10 Database Models** with full schema
- **Environment Variables** reference
- **Deployment Configuration** for Vercel/Render

### Files Created
| File | Lines | Purpose |
|------|-------|---------|
| `docs/FEATURE_INVENTORY.md` | ~500 | Comprehensive feature documentation |

### Files Modified
| File | Changes |
|------|---------|
| `backend/models/sms.py` | Added has_used_chat, first_chat_at fields |
| `backend/api/routes/public.py` | Set has_used_chat on registration |
| `backend/api/routes/analytics.py` | Added guest engagement stats |
| `backend/api/routes/digest.py` | Include engagement in weekly stats |
| `backend/core/database.py` | Added migration for new columns |
| `backend/services/email/email_service.py` | Added engagement section to email |
| `frontend/src/lib/api.ts` | Updated AnalyticsData interface |
| `frontend/src/components/AnalyticsDashboard.tsx` | Added engagement card |

### Key Decisions Made
- **Project Status:** Determined the app is feature-complete
- **Next Focus:** User acquisition rather than more features
- **Documentation:** Created comprehensive inventory for future reference

### Git Commits
1. "Add guest chat usage tracking analytics" - 8 files changed
2. "Add comprehensive feature inventory documentation" - 1 file created

---

## Session: January 5-6, 2026 - Guest Registration Consolidation & Fixes

### Summary
Major session fixing production issues and consolidating the guest registration flow. Merged the separate /join and /chat pages into a unified experience, added duplicate detection, and extended session persistence.

### What We Accomplished

#### 1. CORS Error Fix
Fixed 500 error when signing into dashboard caused by CORS headers missing on exception responses.

**File Modified:** `backend/main.py`
- Added `get_cors_headers(request)` helper function
- Added CORS headers to HTTPException handler
- Added CORS headers to RateLimitExceeded handler
- Added CORS headers to generic Exception handler

#### 2. Database Migration Fix
Fixed "column weddings.chat_greeting does not exist" error on production.

**Problem:** Render free tier has no shell access to run migrations manually.

**Solution:** Added auto-migrations to `backend/core/database.py` `run_migrations()` function:
- `chat_greeting VARCHAR(500)` - Custom greeting message
- `show_branding BOOLEAN DEFAULT true` - Show/hide branding
- `custom_slug VARCHAR(100)` - Custom URL slug

#### 3. Guest Registration Consolidation
**User Request:** Merge /join and /chat into single flow where guests enter info and start chatting.

**Changes:**
- `frontend/src/components/chat/ChatWidget.tsx` - Major rewrite
  - Full registration form: first name, last name, phone (required), email (optional)
  - Extended session expiry from 30 days to 1 year
  - Added `checkForReturningGuest()` to verify via backend API
  - Added `handleRegisterAndStartChat()` for new guests
  - Added `handleReturnGuestStartChat()` for recognized guests

- `frontend/src/app/join/[slug]/page.tsx` - Now redirects to `/chat/{access_code}`

- `backend/api/routes/public.py` - Added new endpoints:
  - `POST /wedding/by-access-code/{access_code}/register` - Guest registration
  - `GET /guest/{guest_id}/verify` - Verify returning guest

- `frontend/src/lib/api.ts` - Added API functions:
  - `registerGuestByAccessCode()`
  - `verifyGuest()`

#### 4. Duplicate Guest Detection
When a guest registers via chat, the system checks if their phone number already exists in the guest list. If so:
- Updates their name if different
- Returns existing guest record
- Preserves their original group (e.g., "Wedding Party" stays as-is)
- New chat-only guests get group "Chat-registered"

#### 5. Session Persistence Extension
Extended localStorage session from 30 days to 1 year (365 days) to cover the full wedding planning timeline.

```typescript
const SESSION_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
```

#### 6. Dashboard Cleanup
Removed the "Guest Self-Registration" section from dashboard since registration is now built into the chat page.

**File Modified:** `frontend/src/app/dashboard/page.tsx`
- Removed `copiedRegistration` state
- Removed `copyRegistrationLink()` function
- Removed entire "Guest Self-Registration" UI block

### Files Created
| File | Purpose |
|------|---------|
| `backend/add_chat_columns.py` | Migration script (superseded by auto-migrate) |

### Files Modified
| File | Changes |
|------|---------|
| `backend/main.py` | CORS headers on exception handlers |
| `backend/core/database.py` | Auto-migrations for new columns |
| `backend/api/routes/public.py` | Guest registration & verification endpoints |
| `frontend/src/components/chat/ChatWidget.tsx` | Full registration form, 1-year sessions |
| `frontend/src/app/join/[slug]/page.tsx` | Redirect to chat page |
| `frontend/src/app/dashboard/page.tsx` | Removed self-registration section |
| `frontend/src/lib/api.ts` | New API functions |

---

## Session: January 5, 2026 - Vendor Management Planning

### Summary
Comprehensive planning session for the Vendor Management Dashboard feature. Conducted full codebase analysis (discovered SMS/guest features not documented), extensive industry research on competitor tools (HoneyBook, Aisle Planner, Planning Pod), and created detailed feature proposal.

### What We Accomplished

#### 1. Full Codebase Analysis
Discovered the codebase has significantly more features than documented:
- **Guest Management**: Full CRUD, bulk CSV/Excel import, RSVP tracking, grouping
- **SMS System**: Twilio integration, templates with {{variables}}, scheduled campaigns
- **Scheduling**: Fixed date/time AND relative scheduling (X days before wedding)
- **Delivery Tracking**: Twilio webhooks, status updates, retry logic
- **TCPA Compliance**: Opt-out handling, consent tracking
- **Background Jobs**: APScheduler for processing scheduled messages

#### 2. Industry Research
Analyzed competitor platforms and industry pain points:
- **Tools Studied**: HoneyBook, Aisle Planner, Planning Pod, Timeline Genius, The Knot, WedStarter
- **Key Finding**: Average couple hires 14 vendors (The Knot 2025 Study)
- **Gap Identified**: No platform combines AI guest chat + vendor management

#### 3. Vendor Management Proposal Created
**File Created:** `docs/VENDOR_MANAGEMENT_PROPOSAL.md` (~500 lines)

Comprehensive feature spec including:
- Stakeholder value propositions (couple, vendor, coordinator)
- Phase 1: Vendor directory, payment tracking, document storage, communication log
- Phase 2: Day-of timeline builder, vendor portal, change notifications
- Phase 3: Public vendor marketplace, reviews, vendor accounts
- Database schema designs
- API endpoint specifications
- UI/UX mockups
- Implementation priorities (4 sprints)
- Competitive differentiation analysis
- Revenue/tier implications

### Files Created
| File | Purpose |
|------|---------|
| `docs/VENDOR_MANAGEMENT_PROPOSAL.md` | Comprehensive vendor management feature specification |

---

## Session: December 30, 2024 - Full Deployment (Vercel + Render) & Mobile Responsive

### Summary
Major deployment session! Deployed the frontend to Vercel and backend to Render with PostgreSQL. Added mobile-responsive hamburger menu, updated branding to bell hop bell icon, and connected frontend to backend.

### What We Accomplished

#### 1. Branding Updates - Bell Hop Bell Icon
Changed from ring SVG to concierge service bell positioned to the RIGHT of "The Wedding Concierge" text.

#### 2. GitHub Repository Setup
- Initialized git repository
- Created comprehensive `.gitignore`
- Pushed to: https://github.com/bkolar18/The-Wedding-Concierge.git

#### 3. Vercel Frontend Deployment
**File Created:** `vercel.json`
- Framework: Next.js
- Build Command: `cd frontend && npm install && npm run build`
- Output Directory: `frontend/.next`

**Live URL:** https://the-wedding-concierge.vercel.app

#### 4. Mobile Responsive Navigation
Added hamburger menu for mobile with:
- `useState` for `mobileMenuOpen` toggle
- Hamburger button visible on `md:hidden`
- Menu closes on link click

#### 5. Render Backend Deployment
**Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
**Root Directory:** `backend`

Multiple deployment errors fixed:
- Port argument expansion
- psycopg2 missing
- DATABASE_URL format (postgres:// → postgresql+asyncpg://)
- Wedding import TYPE_CHECKING
- email-validator missing

**Live URL:** https://wedding-concierge-api.onrender.com/

### Deployment Architecture
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     VERCEL      │  │     RENDER      │  │     RENDER      │
│   (Frontend)    │──│   (Backend)     │──│  (PostgreSQL)   │
│  Next.js App    │  │  FastAPI App    │  │   Database      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Session: December 29, 2024 - Playwright Stealth Implementation

### Summary
Re-implemented Playwright with stealth anti-detection to bypass The Knot's Akamai bot protection. The scraper now successfully extracts all wedding data.

### What We Accomplished

#### 1. Created browser_fetch.py
Implemented `StealthBrowser` class with anti-detection:
- playwright-stealth package for core evasions
- navigator.webdriver masking
- Randomized viewport (1200-1920 x 800-1080)
- Realistic browser plugins and languages
- Scroll simulation for lazy loading

#### 2. Updated scraper.py with Tiered Fallback
```python
BROWSER_REQUIRED_PLATFORMS = {
    "theknot.com": True,
    "weddingwire.com": True,
}
```

Flow: Try httpx first → If blocked (403) → Fallback to Playwright stealth

#### 3. Successful Test with The Knot
Extracted: partner names, wedding date, time, dress code, ceremony/reception venues, events, accommodations.

---

## Session: December 25, 2024 - Scraper Simplification & Hotel Fix

### Summary
Completed hotel data extraction fix and simplified scraper by removing Playwright (later re-added Dec 29).

### What We Accomplished

1. Added `_clean_page_text()` method to filter garbage
2. Prioritized travel subpage content (hotels appear FIRST in full_text)
3. Removed Playwright dependency (httpx only)
4. Verified all imports and routes working

---

## Session: December 24, 2024 - Initial MVP Build

### Summary
Built complete MVP from scratch - AI-powered chat assistant for wedding guests.

### What We Built

**Backend (~1,400 lines):**
- Core Config, Database setup
- Wedding, Chat, User models
- Chat Engine with Claude
- Scraper with BeautifulSoup
- Chat & Wedding APIs

**Frontend (~330 lines):**
- Landing page
- Chat widget component
- API client

**Key Decisions:**
- Next.js frontend, Python/FastAPI backend
- SQLite for dev, PostgreSQL for prod
- Access code system for guests
- Claude claude-sonnet-4-20250514 for chat

---

## Complete Feature List (as of January 2026)

### AI Chat
- [x] Context-aware responses using wedding data
- [x] Response caching (LRU, 1-hour TTL)
- [x] Session persistence (1-year localStorage)
- [x] Guest registration with name, phone, email
- [x] Duplicate detection by phone number
- [x] Dark mode toggle
- [x] Embed mode for external sites

### Wedding Management
- [x] Partner names, date, dress code
- [x] Ceremony and reception venues
- [x] Multiple events (rehearsal, ceremony, reception, brunch)
- [x] Accommodations with room block info
- [x] Custom FAQs
- [x] Custom greeting message
- [x] Branding toggle (premium)
- [x] Custom URL slug

### Vendor Management
- [x] 15+ vendor categories
- [x] Status tracking (inquiry → booked → completed)
- [x] Payment tracking (deposits, installments, balance)
- [x] Budget summary with totals
- [x] Communication log
- [x] Contract AI extraction (Claude vision)

### Guest Outreach
- [x] Guest list with CRUD
- [x] CSV bulk upload
- [x] Group organization
- [x] RSVP tracking
- [x] SMS templates with variables
- [x] Immediate SMS sends
- [x] Scheduled SMS (fixed date/time)
- [x] Relative scheduling (X days before wedding)
- [x] Delivery tracking
- [x] Opt-out handling (TCPA)
- [x] Chat engagement tracking

### Analytics
- [x] Total conversations and messages
- [x] Web vs SMS breakdown
- [x] Topic breakdown (AI-categorized)
- [x] Recent sessions with topics
- [x] Guest engagement (X of Y used chat)
- [x] Weekly digest email

### Data Import
- [x] URL scraping (TheKnot, WeddingWire, etc.)
- [x] Playwright stealth for bot bypass
- [x] Multi-page extraction
- [x] Claude-based data mapping
- [x] Async job processing

### Authentication
- [x] Email/password registration
- [x] JWT token authentication
- [x] Password reset via email
- [x] Rate limiting

### Payments
- [x] Stripe checkout integration
- [x] Free/Standard/Premium tiers
- [x] Webhook processing
- [x] Subscription status tracking

### Public Pages
- [x] Guest chat page
- [x] QR code page for invitations
- [x] Wedding preview page

### PWA & Mobile
- [x] Responsive design
- [x] Service workers
- [x] Install prompt
- [x] Offline capability

---

## Change Log

### v1.0.0 (January 6, 2026)
- Feature complete release
- Added guest chat usage tracking analytics
- Created comprehensive feature inventory documentation
- Ready for user acquisition

### v0.9.0 (January 5-6, 2026)
- Fixed CORS error on dashboard authentication
- Fixed database migration for missing columns
- Consolidated guest registration into chat page
- Extended session persistence to 1 year
- Added duplicate guest detection by phone
- Removed redundant dashboard sections

### v0.8.0 (January 5, 2026)
- Vendor management fully implemented
- Payment tracking and budget summary
- Contract AI extraction
- Communication logging

### v0.7.0 (January 2026)
- Weekly digest emails with topic extraction
- Chat analytics dashboard
- Response caching for cost optimization

### v0.6.0 (December 2024)
- Stripe payment integration
- Subscription tiers implemented

### v0.5.0 (December 2024)
- SMS integration with Twilio
- Scheduled messaging
- Guest management

### v0.4.0 (December 30, 2024)
- Production deployment (Vercel + Render)
- Mobile responsive navigation
- PostgreSQL database

### v0.3.0 (December 29, 2024)
- Playwright stealth for bot bypass
- Multi-page scraping

### v0.2.0 (December 24-25, 2024)
- Multi-page scraping
- Claude data extraction
- Progress bar UI

### v0.1.0 (December 24, 2024)
- Initial MVP release
- Chat widget, scraper, basic API
