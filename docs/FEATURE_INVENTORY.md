# The Wedding Concierge - Feature Inventory

> A comprehensive AI-powered wedding planning platform that helps couples manage their wedding details and provides guests with an intelligent chat assistant for wedding-related questions.

**Last Updated:** January 2026

---

## Overview

The Wedding Concierge is a full-stack web application that combines:
- **AI Chat Assistant** - Guests can ask questions about wedding details 24/7
- **Vendor Management** - Track vendors, payments, contracts, and communications
- **Guest Outreach** - SMS communications, guest lists, and RSVP tracking
- **Analytics** - Insights into guest engagement and chat usage
- **Wedding Import** - Scrape existing wedding websites to populate data

---

## Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL (production) / SQLite (development)
- **ORM:** SQLAlchemy with async support
- **AI:** Claude API (Anthropic) - Haiku for chat, Opus for contract extraction
- **SMS:** Twilio
- **Email:** Resend
- **Payments:** Stripe
- **Scraping:** Playwright with stealth mode
- **Background Jobs:** APScheduler

### Frontend
- **Framework:** Next.js 14+ (TypeScript)
- **Styling:** Tailwind CSS
- **State:** React Context API
- **Storage:** localStorage for session persistence
- **PWA:** Service Workers for offline support

---

## Feature Categories

### 1. AI Chat Assistant

**Purpose:** Allow wedding guests to ask questions about wedding details anytime.

| Feature | Description |
|---------|-------------|
| Web Chat Widget | Embeddable chat interface for guests |
| Context-Aware AI | Uses wedding details to answer questions accurately |
| Response Caching | LRU cache reduces API costs for common questions |
| Session Persistence | Guests return to existing conversations (1-year localStorage) |
| Guest Registration | Collects name, phone, email before chatting |
| Duplicate Detection | Recognizes returning guests by phone number |
| Dark Mode | Toggle for guest preference |
| Embed Mode | Minimal UI for embedding on external sites |

**Endpoints:**
- `GET /api/chat/preview/{access_code}` - Wedding info for chat page
- `POST /api/chat/start` - Start new session
- `POST /api/chat/message` - Send message, get AI response
- `GET /api/chat/history/{session_id}` - Retrieve conversation

---

### 2. Wedding Management

**Purpose:** Couples manage all wedding details in one place.

| Feature | Description |
|---------|-------------|
| Wedding Profile | Partner names, date, dress code, notes |
| Ceremony Details | Venue name, address |
| Reception Details | Separate venue support |
| Events | Multiple events (rehearsal, ceremony, reception, brunch) |
| Accommodations | Hotel recommendations with room block info |
| FAQs | Custom Q&A that AI uses to answer guests |
| Custom Greeting | Personalized chat welcome message |
| Branding Toggle | Show/hide "Powered by" footer (premium) |
| Access Code | Unique code for guest chat access |
| URL Slug | Custom URL for wedding page |

**Endpoints:**
- `POST /api/wedding/me` - Create wedding
- `GET /api/wedding/me` - Get wedding details
- `PATCH /api/wedding/me` - Update wedding
- `POST/PATCH/DELETE /api/wedding/{id}/events/{id}` - Event CRUD
- `POST/PATCH/DELETE /api/wedding/{id}/accommodations/{id}` - Accommodation CRUD
- `POST/PATCH/DELETE /api/wedding/{id}/faqs/{id}` - FAQ CRUD

---

### 3. Vendor Management

**Purpose:** Track all wedding vendors, payments, and communications.

| Feature | Description |
|---------|-------------|
| Vendor Directory | Store vendor contact info and details |
| Categories | 15+ categories (venue, catering, photography, etc.) |
| Status Tracking | Inquiry → Quoted → Booked → Completed |
| Payment Tracking | Deposits, installments, balance payments |
| Budget Summary | Total quoted, paid, remaining across all vendors |
| Communication Log | Track calls, emails, meetings with notes |
| Contract Extraction | AI extracts details from uploaded PDFs |
| Search & Filter | Find vendors by name, category, status |

**Endpoints:**
- `GET /api/vendors/` - List all vendors
- `POST /api/vendors/` - Add vendor
- `GET/PATCH/DELETE /api/vendors/{id}` - Vendor CRUD
- `GET/POST/PATCH/DELETE /api/vendors/{id}/payments/{id}` - Payment CRUD
- `GET/POST /api/vendors/{id}/communications` - Communication log
- `GET /api/vendors/summary/all` - Budget summary
- `POST /api/vendors/extract-contract` - AI contract extraction

**Vendor Categories:**
- Venue, Catering, Photography, Videography, Florist
- DJ/Band, Wedding Planner, Officiant, Hair & Makeup
- Transportation, Rentals, Cake/Desserts, Stationery
- Photo Booth, Lighting/Decor, Other

---

### 4. Guest Outreach (SMS)

**Purpose:** Communicate with guests via SMS for updates and reminders.

| Feature | Description |
|---------|-------------|
| Guest List | Manage all wedding guests |
| CSV Upload | Bulk import guests from spreadsheet |
| Groups | Organize guests (Wedding Party, Family, etc.) |
| RSVP Tracking | Track pending/yes/no/maybe responses |
| SMS Templates | Reusable message templates with variables |
| Variable Substitution | {first_name}, {wedding_date}, {venue}, etc. |
| Send Immediately | Blast SMS to selected guests now |
| Schedule Fixed | Send at specific date/time |
| Schedule Relative | Send X days before wedding/RSVP deadline |
| Delivery Tracking | See sent/delivered/failed status |
| Opt-Out Handling | TCPA compliance, respect unsubscribes |
| Inbound SMS | Receive and route guest replies |
| Chat Engagement | Track which guests have used chat |

**Endpoints:**
- `GET/POST/PATCH/DELETE /api/wedding/{id}/guests/{id}` - Guest CRUD
- `POST /api/wedding/{id}/guests/upload` - CSV bulk upload
- `GET/POST/PATCH/DELETE /api/wedding/{id}/templates/{id}` - Template CRUD
- `POST /api/wedding/{id}/sms/send` - Send immediately
- `POST /api/wedding/{id}/sms/schedule` - Schedule message
- `GET /api/wedding/{id}/sms/scheduled` - List scheduled
- `DELETE /api/wedding/{id}/sms/scheduled/{id}` - Cancel scheduled
- `GET /api/wedding/{id}/sms/history` - Delivery history

---

### 5. Analytics & Reporting

**Purpose:** Insights into guest engagement and chat usage.

| Feature | Description |
|---------|-------------|
| Total Conversations | Chat sessions count |
| Total Messages | Message count across all chats |
| Web vs SMS Chats | Breakdown by channel |
| Topic Breakdown | What guests ask about (dress code, venue, etc.) |
| Recent Sessions | List of recent conversations with topics |
| Guest Engagement | X of Y registered guests have used chat |
| Weekly Digest Email | Automated stats summary to couple |
| Topic Extraction | Claude AI identifies question themes |

**Endpoints:**
- `GET /api/analytics` - Dashboard data
- `POST /api/digest/send-my-digest` - Send weekly email
- `GET /api/digest/preview` - Preview digest stats

---

### 6. Wedding Data Import

**Purpose:** Import existing wedding website data automatically.

| Feature | Description |
|---------|-------------|
| URL Scraping | Extract data from TheKnot, WeddingWire, etc. |
| Async Jobs | Background processing for slow scrapes |
| Playwright Stealth | Bypass bot detection |
| Data Mapping | Map scraped content to wedding fields |
| Manual Import | Enter details manually if scraping fails |

**Endpoints:**
- `POST /api/scrape/` - Start scrape
- `POST /api/scrape/import` - Import scraped data
- `POST /api/scrape/start` - Async scrape job
- `GET /api/scrape/status/{job_id}` - Check job status

---

### 7. Authentication & Accounts

**Purpose:** Secure user accounts for couples.

| Feature | Description |
|---------|-------------|
| Email/Password Auth | Standard registration and login |
| Password Requirements | 8+ chars, 1 uppercase, 1 special |
| JWT Tokens | Secure API authentication |
| Password Reset | Email-based reset flow |
| Rate Limiting | Prevent brute force attacks |
| Session Management | Token-based sessions |

**Endpoints:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get token
- `GET /api/auth/me` - Current user
- `POST /api/auth/logout` - Invalidate session
- `POST /api/auth/forgot-password` - Request reset
- `POST /api/auth/reset-password` - Complete reset

---

### 8. Payments & Subscriptions

**Purpose:** Monetization via Stripe subscriptions.

| Feature | Description |
|---------|-------------|
| Free Tier | Basic features, limited usage |
| Standard Tier | $29 - Full features |
| Premium Tier | $79 - White-label, priority support |
| Stripe Checkout | Secure payment flow |
| Webhook Processing | Handle payment confirmations |
| Subscription Status | Track tier and payment history |

**Endpoints:**
- `GET /api/payment/config` - Stripe public key
- `GET /api/payment/status` - User's subscription
- `POST /api/payment/create-checkout-session` - Start checkout
- `POST /api/payment/webhook` - Stripe webhooks
- `POST /api/payment/verify-session/{id}` - Verify completion

---

### 9. Public Guest Pages

**Purpose:** Public-facing pages for wedding guests.

| Feature | Description |
|---------|-------------|
| Chat Page | `/chat/{accessCode}` - Guest chat interface |
| Join Page | `/join/{slug}` - Wedding preview, redirects to chat |
| QR Code Page | `/qr/{accessCode}` - Printable QR codes |
| Guest Registration | Collect info before chatting |
| Session Recognition | Return guests skip registration |

**Endpoints:**
- `GET /api/public/wedding/{slug}` - Wedding by slug
- `GET /api/public/wedding/by-access-code/{code}` - Wedding by code
- `POST /api/public/wedding/by-access-code/{code}/register` - Guest registration
- `GET /api/public/guest/{id}/verify` - Verify returning guest

---

### 10. PWA & Mobile

**Purpose:** Mobile-friendly experience with app-like features.

| Feature | Description |
|---------|-------------|
| Responsive Design | Works on all screen sizes |
| PWA Support | Installable on mobile devices |
| Service Workers | Offline capability |
| Install Prompt | Suggests adding to home screen |

---

## Database Schema

### Core Models

```
User
├── id, email, hashed_password
├── name, wedding_id (FK)
├── subscription_tier (free/standard/premium)
├── stripe_customer_id, stripe_payment_id
└── created_at, last_login_at

Wedding
├── id, partner1_name, partner2_name
├── wedding_date, dress_code
├── ceremony_venue_name/address
├── reception_venue_name/address
├── access_code, slug, website_url
├── chat_greeting, show_branding
├── rsvp_deadline
└── events[], accommodations[], faqs[]

WeddingEvent
├── id, wedding_id (FK)
├── name, date, time
├── venue_name, venue_address
├── description, dress_code
└── created_at

WeddingAccommodation
├── id, wedding_id (FK)
├── hotel_name, address, phone
├── booking_url
├── has_room_block, block_name, block_code, block_rate
└── notes

WeddingFAQ
├── id, wedding_id (FK)
├── question, answer, category
└── created_at
```

### Chat Models

```
ChatSession
├── id, wedding_id (FK)
├── guest_name, guest_identifier
├── channel (web/sms)
└── created_at, last_message_at

ChatMessage
├── id, session_id (FK)
├── role (user/assistant)
├── content
└── created_at
```

### Guest/SMS Models

```
Guest
├── id, wedding_id (FK)
├── name, phone_number, email
├── group_name, rsvp_status
├── sms_consent, opted_out
├── has_used_chat, first_chat_at
└── created_at

SMSTemplate
├── id, wedding_id (FK)
├── name, content, category
└── is_default

ScheduledMessage
├── id, wedding_id (FK)
├── name, message_content
├── recipient_type, recipient_filter
├── schedule_type (fixed/relative)
├── scheduled_at / relative_to + relative_days
├── status, sent_count, failed_count
└── created_at, sent_at

MessageLog
├── id, wedding_id (FK), guest_id (FK)
├── phone_number, message_content
├── twilio_sid, status
├── error_code, error_message
└── created_at, sent_at, delivered_at
```

### Vendor Models

```
Vendor
├── id, wedding_id (FK)
├── business_name, category, status
├── contact_name, contact_email, contact_phone
├── website, instagram_handle
├── contract_amount, deposit_amount, deposit_paid
├── service_date, service_time
├── notes
└── created_at

VendorPayment
├── id, vendor_id (FK)
├── payment_type, amount
├── due_date, paid_date
├── payment_method, confirmation_number
└── status, notes

VendorCommunication
├── id, vendor_id (FK)
├── communication_type (email/phone/text/note)
├── notes, communication_date
└── created_at
```

---

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Authentication
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# AI
ANTHROPIC_API_KEY=sk-ant-...

# SMS
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STANDARD_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# URLs
FRONTEND_URL=https://yourapp.com
BACKEND_URL=https://api.yourapp.com

# Features
DEBUG=false
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=https://api.yourapp.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

---

## Deployment

### Backend (Render)
- Web Service with Dockerfile
- PostgreSQL database
- Environment variables configured
- Auto-deploy from GitHub

### Frontend (Vercel)
- Next.js deployment
- Environment variables configured
- Auto-deploy from GitHub

---

## Future Considerations

These features are documented for potential future development:

1. **Calendar Integration** - Sync wedding timeline to Google/Apple Calendar
2. **Multi-language Support** - Chat in guest's preferred language
3. **Photo Gallery** - Guests upload/view wedding photos
4. **Guest Seating** - Table assignment and meal preference tracking
5. **Wedding Website Builder** - Full website, not just chat
6. **Multi-user Access** - Wedding party member accounts
7. **Mobile Apps** - Native iOS/Android apps
8. **Video Messages** - Record video RSVPs or messages

---

## Support

- **GitHub Issues:** [github.com/bkolar18/The-Wedding-Concierge/issues](https://github.com/bkolar18/The-Wedding-Concierge/issues)
- **Documentation:** This file and `/docs/` folder
