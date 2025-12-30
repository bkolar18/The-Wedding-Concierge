# Wedding Chat Tool

An AI-powered chat assistant that helps wedding guests get instant answers about upcoming weddings.

## Features

- **Smart Q&A**: Guests ask natural questions like "What hotel has the room block?" and get instant answers
- **Wedding Website Scraping**: Automatically imports details from The Knot, Zola, and other popular wedding sites
- **Manual Entry**: Couples can also manually enter/edit wedding details
- **Embeddable Widget**: Chat widget that couples can embed on their wedding website
- **SMS Support** (Phase 2): Guests can text questions for quick answers

## Tech Stack

- **Frontend**: Next.js (React) - Marketing pages, couple dashboard, chat widget
- **Backend**: Python/FastAPI - API, scraping, LLM integration
- **Database**: PostgreSQL
- **LLM**: Claude (Anthropic)
- **SMS**: Twilio (Phase 2)

## Project Structure

```
wedding-chat-tool/
├── backend/           # Python/FastAPI backend
│   ├── api/           # API routes
│   ├── models/        # Database models
│   ├── services/      # Business logic
│   │   ├── scraper/   # Wedding website scrapers
│   │   ├── chat/      # LLM chat engine
│   │   └── sms/       # Twilio integration (Phase 2)
│   └── core/          # Config, database, auth
├── frontend/          # Next.js frontend
│   ├── app/           # App router pages
│   ├── components/    # React components
│   │   └── chat/      # Chat widget
│   └── lib/           # Utilities
└── docs/              # Documentation
```

## Getting Started

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost/wedding_chat
ANTHROPIC_API_KEY=your-claude-api-key
SECRET_KEY=your-secret-key
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## License

MIT
