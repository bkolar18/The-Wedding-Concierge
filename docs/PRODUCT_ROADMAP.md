# Wedding Concierge - Product Roadmap

> Comprehensive implementation plan for high-value features, quick wins, strategic initiatives, and technical improvements.

---

## Executive Summary

This roadmap transforms Wedding Concierge from a "wedding chat bot" into a **full wedding command center**. The prioritization balances:
- **Revenue enablement** (can't grow without monetization)
- **User value demonstration** (analytics prove ROI to couples)
- **Distribution expansion** (embeddable widget, guest self-signup)
- **Product stickiness** (vendor integration, mobile app)

---

## Phase 1: Foundation & Monetization
*Goal: Enable revenue and prove value to users*

### 1.1 Stripe Integration
**Priority: CRITICAL** | **Complexity: Medium**

Enables charging customers. Without this, everything else is academic.

**Implementation:**
- Stripe Checkout for one-time payment ($49)
- Webhook handling for payment confirmation
- User `is_paid` flag in database
- Gated features for free vs paid tiers
- Receipt emails via Stripe

**Files to modify:**
- `backend/models/user.py` - Add subscription fields
- `backend/api/routes/` - New `payment.py` route
- `frontend/src/app/pricing/page.tsx` - Connect to Stripe Checkout
- `frontend/src/lib/api.ts` - Payment API functions

**Pricing tiers to implement:**
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Chat only, 50 msgs/month, "Powered by" branding |
| Standard | $49 one-time | Unlimited chat, SMS, vendors, no branding |
| Premium | $99 one-time | Everything + priority support + custom subdomain |

---

### 1.2 Analytics Dashboard for Couples
**Priority: CRITICAL** | **Complexity: Medium**

Couples need to SEE value. "You saved 47 questions this week" is powerful.

**Metrics to track:**
- Total chat sessions
- Total messages
- Questions by category (hotels, logistics, dress code, etc.)
- Peak usage times
- Unanswered/uncertain responses
- Guest engagement over time (graph)

**Implementation:**
- New `ChatAnalytics` component in dashboard
- Backend aggregation endpoints
- Store question categories in `ChatMessage` model
- Weekly email digest (optional, Phase 2)

**New API endpoints:**
```
GET /api/analytics/summary - Total stats
GET /api/analytics/messages-by-day - Time series
GET /api/analytics/top-questions - Common queries
GET /api/analytics/unanswered - Questions bot struggled with
```

---

### 1.3 Chat Transcript View
**Priority: HIGH** | **Complexity: Low**

Let couples see actual conversations. Builds trust and surfaces insights.

**Implementation:**
- New "Conversations" tab in dashboard
- List of chat sessions with timestamps
- Expandable view showing full conversation
- Filter by date range
- Export to CSV/PDF

**Files to modify:**
- `frontend/src/app/dashboard/page.tsx` - Add Conversations tab
- `frontend/src/components/ConversationList.tsx` - New component
- `backend/api/routes/chat.py` - Add `GET /sessions` endpoint

---

## Phase 2: Distribution & Growth
*Goal: Make it easier for guests to find and use the chat*

### 2.1 Embeddable Chat Widget
**Priority: HIGH** | **Complexity: Medium**

Let couples embed the chat directly on their own wedding website.

**Implementation:**
- Standalone widget bundle (iframe or web component)
- Script tag couples can copy/paste
- Customizable colors to match their site
- Responsive design (works on mobile)
- Opens as floating bubble or inline

**Technical approach:**
```html
<!-- Couple adds this to their site -->
<script src="https://weddingconcierge.com/widget.js"
        data-wedding="abc123"></script>
```

**Files to create:**
- `frontend/src/widget/` - Standalone widget app
- `frontend/public/widget.js` - Embeddable script
- Build config for separate widget bundle

---

### 2.2 Guest Self-Registration Page
**Priority: HIGH** | **Complexity: Low**

Public page where guests can opt-in to receive the chat link via SMS.

**URL structure:** `weddingconcierge.com/join/[wedding-slug]`

**Flow:**
1. Guest visits link (from invite QR code, wedding website, etc.)
2. Enters name and phone number
3. Receives SMS with chat link
4. Added to couple's guest list automatically

**Benefits:**
- Solves phone number collection problem
- Viral distribution (guests share with each other)
- TCPA compliant (explicit opt-in)
- Zero effort for couples

**Implementation:**
- New public page `/join/[slug]`
- Wedding slug field in database
- SMS sending on registration (Twilio)
- Guest auto-creation with consent flag

---

### 2.3 QR Code Generation
**Priority: MEDIUM** | **Complexity: Low**

Generate QR codes for chat link and guest registration page.

**Implementation:**
- QR code generation library (client-side)
- Download as PNG/SVG
- Customizable size
- Include in "Share with Guests" section

**Use cases:**
- Print on save-the-dates
- Display at welcome table
- Include in wedding program

---

## Phase 3: Vendor Integration with Chat
*Goal: Make vendor data useful to guests*

### 3.1 Vendor-Aware Chat Engine
**Priority: HIGH** | **Complexity: Medium**

The chat bot should know about vendors and answer related questions.

**Questions the bot should handle:**
- "Who is the photographer?"
- "What's the venue's phone number?"
- "Is there a DJ or band?"
- "Who should I contact about dietary restrictions?" (→ caterer)

**Implementation:**
- Extend chat system prompt to include vendor data
- Map vendor categories to common questions
- Include vendor contact info in responses where appropriate

**System prompt additions:**
```
VENDORS:
- Venue: The Grand Ballroom (contact: events@grand.com, 555-1234)
- Photographer: Jane Smith Photography (Instagram: @janesmithphoto)
- Caterer: Delicious Catering Co (contact for dietary needs: chef@delicious.com)
- DJ: DJ Mike (requests: djmike@email.com)
```

---

### 3.2 Vendor Budget Summary
**Priority: MEDIUM** | **Complexity: Low**

Roll up vendor costs into a budget overview.

**Dashboard additions:**
- Total contracted amount
- Total paid to date
- Remaining balance
- Payment timeline (upcoming due dates)
- Budget vs actual pie chart

---

### 3.3 Vendor Contract Upload & Extraction
**Priority: MEDIUM** | **Complexity: Medium-High**

Allow couples to upload vendor contracts (PDF/images) and auto-extract key details.

**Extracted data:**
- Vendor contact info (name, email, phone)
- Contract total amount
- Payment schedule (deposits, installments, final payment)
- Due dates
- Service date/time
- Key terms (cancellation policy, etc.)

**Privacy-conscious implementation:**
- **"Extract & delete" option** - Parse contract, populate fields, delete original file
- **Manual review step** - Show extracted data before saving, let user edit/approve
- **Optional feature** - Don't force it; offer as a convenience
- **Clear privacy messaging** - "Your contracts are processed securely and never shared"
- **Encrypted storage** - If originals are kept, encrypt at rest

**User flow:**
1. Click "Upload Contract" on vendor detail page
2. Select PDF or image file
3. Processing indicator while AI extracts data
4. Review screen showing extracted fields (editable)
5. Confirm to save to vendor record
6. Option: "Keep original" or "Delete after extraction"

**Technical implementation:**
- File upload to secure storage (S3/R2 with encryption)
- Claude API for document understanding (vision for images, text for PDFs)
- Structured extraction prompt for payment terms
- Auto-populate vendor payment schedule from extracted dates

**Why couples will use it despite privacy concerns:**
- Time savings (10-page contract → auto-filled payment schedule)
- The extracted data isn't more sensitive than manual entry
- Trust built through transparency and "extract & delete" option
- Same demographic already uses cloud storage for wedding docs

---

## Phase 4: Mobile Experience
*Goal: Meet couples where they are (on mobile)*

### 4.1 Progressive Web App (PWA)
**Priority: HIGH** | **Complexity: Low**

Make the existing web app installable and work offline.

**Implementation:**
- Service worker for offline support
- Web app manifest
- Push notification support
- "Add to Home Screen" prompt

**Benefits:**
- No app store approval needed
- Same codebase
- Works on iOS and Android
- Instant updates

---

### 4.2 Native Mobile App (Future)
**Priority: LOW** | **Complexity: High**

Full native app using React Native or Flutter.

**Only pursue if:**
- PWA adoption is strong and users want more
- Specific native features needed (contacts import, etc.)
- Revenue justifies development cost

**Recommended approach:** React Native (code sharing with web)

---

## Phase 5: Enhanced Manual Entry
*Goal: Make manual setup delightful, not tedious*

### 5.1 Guided Setup Wizard
**Priority: HIGH** | **Complexity: Medium**

Step-by-step onboarding as an alternative to scraping, or to enhance scraped data.

**Entry points:**
1. Button on `/import` page: "Or set up manually with our wizard"
2. After successful scrape: "Review & enhance your details" button
3. From dashboard: "Complete your profile" prompt if data is sparse

**Steps:**
1. Basic info (names, date, dress code)
2. Venue details (ceremony + reception)
3. Events (with presets: welcome drinks, ceremony, reception, brunch)
4. Accommodations (hotel room blocks)
5. FAQs (with suggested questions)
6. Review & activate

**Features:**
- Progress bar showing completion
- Skip & return later (save progress)
- "Profile completeness" score on dashboard
- Smart suggestions at each step
- Pre-fill with scraped data if available

---

### 5.2 FAQ Templates & Suggestions
**Priority: MEDIUM** | **Complexity: Low**

Pre-written FAQs couples can add with one click.

**Template categories:**
- Logistics (parking, timing, kids)
- Dress code clarifications
- Accommodation details
- Food & drink
- RSVP & plus-ones
- Day-of logistics

**Implementation:**
- FAQ template library
- "Add suggested FAQ" button
- Auto-customize with wedding details
- AI-generated suggestions based on venue/date

---

### 5.3 Spreadsheet Import for Guests
**Status: COMPLETE** | ~~Priority: HIGH~~ | ~~Complexity: Medium~~

CSV/Excel upload for guest list - already implemented in SMSManager.

---

### 5.4 Wedding Platform Guest Sync
**Priority: MEDIUM** | **Complexity: High**

OAuth integration with Zola, Joy, The Knot to pull guest lists directly.

**Implementation:**
- OAuth 2.0 flow with each platform
- Guest data mapping to our schema
- Periodic sync option (daily/manual)
- Merge with existing guests (duplicate detection)

**Platforms to support:**
1. Zola (most open API)
2. Joy/WithJoy
3. The Knot (may require scraping if no API)

**Note:** Research API availability before committing. Some platforms may not offer guest list APIs.

---

## Phase 6: Quick Wins
*Low effort, high impact improvements*

| Feature | Effort | Impact | Description |
|---------|--------|--------|-------------|
| Weekly stats email | Low | High | Automated email showing chat activity |
| QR code generator | Low | Medium | Downloadable QR for chat link |
| Export conversations | Low | Medium | CSV/PDF of chat transcripts |
| Custom chat greeting | Low | Medium | Couple sets welcome message |
| "Powered by" toggle | Low | High | Premium feature to remove branding |
| Session persistence | Low | Medium | Remember guest across visits |
| Dark mode | Low | Low | Theme option for chat widget |

---

## Implementation Order (Recommended)

Based on dependencies and impact:

```
MONTH 1: Growth & Onboarding
├── 2.2 Guest Self-Registration Page ← START HERE
├── 2.3 QR Code Generation (pairs with above)
├── 5.1 Guided Setup Wizard (improves conversion)
└── 5.2 FAQ Templates (enhances wizard)

MONTH 2: Revenue Foundation
├── 1.1 Stripe Integration
├── 1.2 Analytics Dashboard
└── 1.3 Chat Transcript View

MONTH 3: Stickiness
├── 3.1 Vendor-Aware Chat Engine
├── 3.2 Vendor Budget Summary
├── 5.4 Wedding Platform Guest Sync (research first)
└── 4.1 PWA Implementation

MONTH 4: Distribution & Polish
├── 2.1 Embeddable Widget
└── Quick Wins (weekly email, export, greeting)
```

**Rationale for order change:**
- Guest self-signup + QR enables viral growth immediately
- Setup wizard improves conversion for couples who can't/won't scrape
- Revenue features can wait until we have more users
- Platform sync needs API research before committing

---

## Technical Debt & Infrastructure

### Scraper Resilience
- Add retry logic with exponential backoff
- Cache successful scrapes (don't re-scrape unless requested)
- Fallback to manual entry with pre-filled fields on failure
- Monitor scraper success rate by platform
- Alert on platform-wide failures

### Testing
- Unit tests for chat engine
- Integration tests for scraper
- E2E tests for critical flows (signup → scrape → chat)
- Load testing for concurrent chat sessions

### Security
- Rate limiting on all endpoints
- Input sanitization in chat
- CSRF protection
- API key rotation strategy

### Monitoring
- Error tracking (Sentry)
- Performance monitoring
- Uptime alerts
- Chat quality monitoring (failed responses)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Conversion rate | 5% visitors → paid | Stripe + analytics |
| Chat engagement | 10+ msgs/wedding avg | Database query |
| Scraper success | 90%+ | Log analysis |
| Guest opt-in rate | 30% of invited guests | Registration page analytics |
| NPS | 50+ | Post-wedding survey |
| Monthly revenue | $5K+ by month 6 | Stripe dashboard |

---

## Open Questions for Decision

1. **Pricing model:** One-time vs subscription? Current plan is one-time $49.
2. **Free tier limits:** 50 messages/month? Time-limited trial?
3. **SMS costs:** Pass through to customer or include in price?
4. **White-label:** Offer to wedding planners as reseller?
5. **API access:** Let developers build on the platform?

---

## Appendix: File Structure for New Features

```
backend/
├── api/routes/
│   ├── analytics.py      # NEW - Analytics endpoints
│   ├── payment.py        # NEW - Stripe integration
│   └── guest_signup.py   # NEW - Public guest registration
├── models/
│   ├── analytics.py      # NEW - Analytics aggregation
│   └── user.py           # MODIFY - Add payment fields
└── services/
    └── email/            # NEW - Email notifications
        ├── __init__.py
        └── weekly_digest.py

frontend/
├── src/
│   ├── app/
│   │   ├── join/[slug]/page.tsx    # NEW - Guest registration
│   │   └── dashboard/
│   │       └── conversations/       # NEW - Transcript view
│   ├── components/
│   │   ├── Analytics.tsx           # NEW
│   │   ├── ConversationList.tsx    # NEW
│   │   ├── QRCode.tsx              # NEW
│   │   └── GuestImport.tsx         # NEW
│   └── widget/                     # NEW - Embeddable widget
│       ├── index.tsx
│       └── ChatBubble.tsx
└── public/
    └── widget.js                   # NEW - Widget embed script
```

---

*Document created: January 2026*
*Last updated: January 2026*
