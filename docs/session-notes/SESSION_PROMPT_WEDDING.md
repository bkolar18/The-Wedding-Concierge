# Session Prompt - Wedding Chat Tool

**Read this file at the start of every session to understand project status and context.**

---

## Quick Start Checklist

1. **Read these files in order:**
   - `SESSION_PROMPT_WEDDING.md` (this file) - Current status & next steps
   - `SESSION_LOG_WEDDING.md` - Recent work & roadmap
   - `CLAUDE_CONTEXT_WEDDING.md` - Full project architecture
   - `docs/FEATURE_INVENTORY.md` - **NEW** Comprehensive feature documentation

2. **Project Location:**
   ```
   C:\Users\brenn\Documents\Coding Projects\Wedding Chat Tool\
   ```

3. **Critical Rule:** Always use complete absolute Windows paths with drive letters and backslashes for ALL file operations.

---

## Current Project Status (January 6, 2026)

### Phase: FEATURE COMPLETE - READY FOR USER ACQUISITION

**The Wedding Concierge is a production-ready SaaS platform. All core features are implemented. Focus should now shift to getting real users and feedback.**

### Live URLs:
- **Frontend:** https://the-wedding-concierge.vercel.app
- **Backend API:** https://wedding-concierge-api.onrender.com/
- **GitHub:** https://github.com/bkolar18/The-Wedding-Concierge.git

### Feature Summary (10 Categories, 40+ Endpoints):
- **AI Chat** - Context-aware responses, session persistence (1 year), guest registration
- **Wedding Management** - Events, accommodations, FAQs, venues, custom greetings
- **Vendor Management** - 15+ categories, payment tracking, budget summary, contract AI extraction
- **Guest Outreach** - SMS blasts, scheduling, templates, CSV upload, RSVP tracking
- **Analytics** - Chat engagement tracking, topic breakdown, weekly digest emails
- **Data Import** - Scrape TheKnot/WeddingWire with Playwright stealth
- **Authentication** - JWT tokens, password reset, rate limiting
- **Payments** - Stripe subscriptions (Free/Standard/Premium tiers)
- **Public Pages** - Guest chat, QR codes, wedding preview pages
- **PWA** - Mobile-friendly, installable, offline support

### What Changed Today (Jan 6, 2026):

1. **Guest Chat Usage Tracking**
   - Added `has_used_chat` and `first_chat_at` fields to Guest model
   - Tracks when guests use the chat for analytics
   - Shows "X of Y guests have used chat" in dashboard and weekly email

2. **Feature Inventory Documentation**
   - Created comprehensive `docs/FEATURE_INVENTORY.md` (~500 lines)
   - Documents all 40+ API endpoints, 10 pages, 8 components
   - Complete database schema reference
   - Tech stack and deployment info

3. **Previous Session Accomplishments (Recent):**
   - Fixed CORS error on dashboard authentication
   - Fixed database migration (chat_greeting, show_branding, custom_slug columns)
   - Consolidated guest registration into chat page (merged /join and /chat)
   - Extended session persistence to 1 year for wedding planning timeline
   - Added duplicate guest detection by phone number
   - Removed redundant guest self-registration section from dashboard

---

## IMMEDIATE NEXT STEPS

### Priority 1: Get Real Users
The app is feature-complete. The most valuable next step is:
- Get 2-5 couples to use it for their actual weddings
- Collect feedback on what works and what's missing
- Watch analytics to see which features get used

### Priority 2: If User Requests Features
Only add features if real users request them. Potential enhancements:
- Calendar integration (Google/Apple)
- Multi-language chat support
- Photo gallery
- Native mobile apps

### Priority 3: Deferred Technical Items
- Add automated tests
- Set up CI/CD pipeline
- Configure production monitoring/alerting

---

## Key Documentation Files

| File | Purpose |
|------|---------|
| `docs/FEATURE_INVENTORY.md` | **START HERE** - Complete feature documentation |
| `docs/VENDOR_MANAGEMENT_PROPOSAL.md` | Vendor feature planning (implemented) |
| `docs/session-notes/CLAUDE_CONTEXT_WEDDING.md` | Full architecture reference |
| `docs/session-notes/SESSION_LOG_WEDDING.md` | Detailed work history |

---

## Important: Render Free Tier Cold Starts

The Render free tier has "cold starts" - if no one visits for 15 minutes, the server spins down. The first request after that takes ~30 seconds to wake up. This is normal behavior for free tier hosting.

---

## Running Locally (for development)

### Start Backend
```bash
cd "C:\Users\brenn\Documents\Coding Projects\Wedding Chat Tool\backend"
"venv\Scripts\python.exe" -B -m uvicorn main:app --port 8000
```

### Start Frontend
```bash
cd "C:\Users\brenn\Documents\Coding Projects\Wedding Chat Tool\frontend"
npm run dev
```

### Local URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Environment & Secrets

### Backend Secrets (in Render Dashboard)
- `DATABASE_URL` - PostgreSQL connection (auto-provided by Render)
- `ANTHROPIC_API_KEY` - Claude API key
- `SECRET_KEY` - JWT signing key
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - SMS
- `RESEND_API_KEY` - Email service
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Payments

### Frontend Secrets (in Vercel Dashboard)
- `NEXT_PUBLIC_API_URL` = https://wedding-concierge-api.onrender.com
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key

---

## Development Roadmap

### Phase 1-3: Core Features (COMPLETE)
- [x] AI Chat with Claude
- [x] Wedding management (events, accommodations, FAQs)
- [x] Website scraping with Playwright stealth
- [x] User authentication with JWT
- [x] Deployment (Vercel + Render + PostgreSQL)

### Phase 4: Guest Outreach (COMPLETE)
- [x] Guest management with CSV import
- [x] Twilio SMS integration
- [x] Scheduled campaigns (fixed & relative)
- [x] Delivery tracking

### Phase 5: Vendor Management (COMPLETE)
- [x] Vendor directory with 15+ categories
- [x] Payment tracking and budget summary
- [x] Communication log
- [x] Contract AI extraction

### Phase 6: Analytics & Polish (COMPLETE)
- [x] Chat analytics with topic breakdown
- [x] Guest engagement tracking
- [x] Weekly digest emails
- [x] Stripe payment integration
- [x] PWA support
- [x] Dark mode for chat

### Phase 7: User Acquisition (CURRENT)
- [ ] Get real couples using the platform
- [ ] Collect user feedback
- [ ] Iterate based on actual usage patterns

---

## Session Documentation Locations

All session documentation lives in:
```
C:\Users\brenn\Documents\Coding Projects\Wedding Chat Tool\docs\session-notes\
```

- `SESSION_PROMPT_WEDDING.md` - This file (start here)
- `SESSION_LOG_WEDDING.md` - Detailed work log
- `CLAUDE_CONTEXT_WEDDING.md` - Full architecture reference

Feature documentation:
```
C:\Users\brenn\Documents\Coding Projects\Wedding Chat Tool\docs\FEATURE_INVENTORY.md
```
