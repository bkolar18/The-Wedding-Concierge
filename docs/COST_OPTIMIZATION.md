# API Cost Optimization Guide

This document outlines the cost optimization strategies implemented in The Wedding Concierge.

## Current API Usage

### 1. Anthropic Claude API

| Use Case | Model | Trigger | Cost Control |
|----------|-------|---------|--------------|
| **Guest Chat** | Haiku 3.5 | Every guest message | Response caching, cheaper model |
| **Website Scraping** | Sonnet 3.5 | Once per wedding setup | One-time cost |
| **Weekly Digest Topics** | Haiku 3 | Weekly per wedding | 50 message limit |
| **Vendor Suggestions** | Sonnet 3.5 | Manual trigger only | User-initiated |

**Model Selection Rationale:**
- **Haiku 3.5** (`claude-3-5-haiku-20241022`): Used for chat - 10x cheaper than Sonnet, fast responses, handles Q&A well
- **Sonnet 3.5**: Used for complex extraction (scraping, vendor suggestions) where quality matters more

### 2. Twilio SMS

| Use Case | Trigger | Cost |
|----------|---------|------|
| Welcome SMS | Guest self-registration | ~$0.0079/SMS |
| SMS Blasts | Manual by couple | ~$0.0079/SMS |
| Scheduled Messages | Background jobs | ~$0.0079/SMS |

### 3. Resend Email

| Use Case | Trigger | Cost |
|----------|---------|------|
| Weekly Digest | Scheduled/manual | ~$0.001/email |
| Contact Form | User submission | ~$0.001/email |

---

## Cost Optimizations Implemented

### 1. Response Caching (Chat)

**Location:** `services/chat/chat_engine.py`

**How it works:**
- LRU cache with 100 entries max (~100KB memory)
- 1-hour TTL per entry
- Cache key = wedding_id + data_hash + normalized_message
- Only caches first messages (no conversation history)
- Auto-invalidates when wedding data changes

**Expected savings:** 20-40% reduction in chat API calls for repeat questions like:
- "What's the dress code?"
- "Where is the ceremony?"
- "What hotels have room blocks?"

**Storage:** ~100KB max (negligible)

### 2. Haiku Model for Chat

**Location:** `core/config.py` line 48

```python
LLM_MODEL: str = "claude-3-5-haiku-20241022"
```

**Cost comparison:**
- Sonnet 3.5: $3/1M input, $15/1M output
- Haiku 3.5: $0.80/1M input, $4/1M output

**Savings:** ~75% reduction in per-message cost

### 3. Topic Extraction with Haiku

**Location:** `api/routes/digest.py`

Uses `claude-3-haiku-20240307` for weekly digest topic extraction.
- Limited to 50 messages per analysis
- Cost: ~$0.0003 per weekly digest

### 4. Message Limits

| Feature | Limit | Purpose |
|---------|-------|---------|
| Topic extraction | 50 messages | Control API input size |
| Full text in chat | 25KB | Stay within token limits |

---

## Estimated Costs Per Wedding

### Average Wedding (100 guests, 3 months)

| Activity | Calls | Cost |
|----------|-------|------|
| Website Scrape | 1 | $0.02 |
| Guest Chat (with caching) | ~35 | $0.21 |
| Guest Registrations (SMS) | 30 | $0.24 |
| Scheduled SMS (3 blasts) | 90 | $0.71 |
| Weekly Digests | 12 | $0.004 |
| **Total** | | **~$1.18** |

### High-Activity Wedding (200 guests, 6 months)

| Activity | Calls | Cost |
|----------|-------|------|
| Website Scrape | 1 | $0.02 |
| Guest Chat (with caching) | ~140 | $0.84 |
| Guest Registrations (SMS) | 100 | $0.79 |
| Scheduled SMS (6 blasts) | 600 | $4.74 |
| Weekly Digests | 24 | $0.008 |
| **Total** | | **~$6.40** |

---

## Batch SMS Sends (Future Optimization)

**What it is:** Instead of sending SMS messages one at a time, batch them into a single API request.

**How Twilio batching works:**
1. **Messaging Services**: Use a Messaging Service SID instead of individual phone numbers
2. **Bulk API**: Twilio's Messaging API can accept multiple recipients
3. **Rate optimization**: Twilio handles throttling and delivery optimization

**Potential benefits:**
- Slightly lower per-message costs with high volume
- Better delivery optimization by Twilio
- Reduced API call overhead

**Current status:** Not implemented. Our current volume doesn't justify the complexity.
When to implement: If sending 1000+ messages/day regularly.

**Implementation approach:**
```python
# Instead of:
for guest in guests:
    await twilio_service.send_sms(guest.phone, message)

# Use Twilio's bulk messaging:
twilio_client.messages.create(
    messaging_service_sid="MGXXXXXXX",
    to=[guest.phone for guest in guests],
    body=message
)
```

---

## Monitoring Recommendations

1. **Track cache hit rate** - Add metrics to `ResponseCache.stats`
2. **Monitor API costs** - Check Anthropic/Twilio dashboards monthly
3. **Alert on anomalies** - Set up billing alerts at $10, $50, $100

---

## Future Optimizations (If Needed)

1. **Semantic caching**: Cache similar questions (not just exact matches)
2. **Precomputed FAQ responses**: Generate responses for common questions at wedding setup
3. **Tiered models**: Use Haiku for simple questions, Sonnet for complex ones
4. **Redis caching**: Persistent cache across server restarts (if memory becomes an issue)
