/**
 * API client for The Wedding Concierge backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Debug: Log the API URL being used (remove after debugging)
if (typeof window !== 'undefined') {
  console.log('[API] Using API_URL:', API_URL);
}

interface StartChatResponse {
  session_id: string;
  greeting: string;
  wedding_title: string;
}

interface ChatResponse {
  response: string;
  session_id: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface WeddingPreview {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  ceremony_venue_name: string | null;
  ceremony_venue_address: string | null;
  dress_code: string | null;
  access_code: string;
  wedding_website_url: string | null;
  chat_greeting: string | null;
  show_branding: boolean;
}

/**
 * Get wedding preview info by access code.
 */
export async function getWeddingPreview(accessCode: string): Promise<WeddingPreview> {
  const response = await fetch(`${API_URL}/api/chat/preview/${encodeURIComponent(accessCode)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Wedding not found');
  }

  return response.json();
}

/**
 * Start a new chat session with a wedding.
 */
export async function startChat(accessCode: string, guestName?: string): Promise<StartChatResponse> {
  const response = await fetch(`${API_URL}/api/chat/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_code: accessCode,
      guest_name: guestName,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start chat');
  }

  return response.json();
}

/**
 * Send a message in an existing chat session.
 */
export async function sendMessage(sessionId: string, message: string): Promise<ChatResponse> {
  const response = await fetch(`${API_URL}/api/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: sessionId,
      message: message,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send message');
  }

  return response.json();
}

/**
 * Get chat history for a session.
 */
export async function getChatHistory(sessionId: string): Promise<{ messages: ChatMessage[] }> {
  const response = await fetch(`${API_URL}/api/chat/history/${sessionId}`);

  if (!response.ok) {
    throw new Error('Failed to get chat history');
  }

  return response.json();
}

/**
 * Health check.
 */
export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/api/health`);
  return response.json();
}

// ============ AUTH API ============

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  wedding_id: string | null;
  wedding_access_code: string | null;
  wedding_partner1: string | null;
  wedding_partner2: string | null;
  is_verified: boolean;
  created_at: string;
}

/**
 * Register a new user account.
 */
export async function register(email: string, password: string, name?: string): Promise<AuthToken> {
  const url = `${API_URL}/api/auth/register`;
  console.log('[API] Register request to:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  console.log('[API] Register response status:', response.status);

  if (!response.ok) {
    const error = await response.json();
    console.log('[API] Register error:', error);
    throw new Error(error.detail || 'Registration failed');
  }

  return response.json();
}

/**
 * Login with email and password.
 */
export async function login(email: string, password: string): Promise<AuthToken> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  return response.json();
}

/**
 * Get current user profile.
 */
export async function getCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get user');
  }

  return response.json();
}

/**
 * Request a password reset email.
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send reset email');
  }

  return response.json();
}

/**
 * Reset password using a token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to reset password');
  }

  return response.json();
}

// ============ WEDDING API ============

export interface WeddingData {
  id: string;
  partner1_name: string;
  partner2_name: string;
  couple_email: string;
  wedding_date: string | null;
  wedding_time: string | null;
  dress_code: string | null;
  ceremony: {
    venue_name: string;
    address: string;
    url: string | null;
  } | null;
  reception: {
    venue_name: string;
    address: string;
    url: string | null;
    time: string | null;
  } | null;
  registry_urls: Record<string, string> | null;
  wedding_website_url: string | null;
  rsvp_url: string | null;
  rsvp_deadline: string | null;
  additional_notes: string | null;
  access_code: string;
  slug: string | null;
  chat_greeting: string | null;
  show_branding: boolean;
  chat_url: string;
  join_url: string | null;
  events: Array<{
    id: string;
    name: string;
    date: string | null;
    time: string | null;
    venue_name: string | null;
    venue_address: string | null;
    description: string | null;
    dress_code: string | null;
  }>;
  accommodations: Array<{
    id: string;
    hotel_name: string;
    address: string | null;
    phone: string | null;
    booking_url: string | null;
    has_room_block: boolean;
    room_block_name: string | null;
    room_block_code: string | null;
    room_block_rate: string | null;
    room_block_deadline: string | null;
    distance_to_venue: string | null;
    notes: string | null;
  }>;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    category: string | null;
  }>;
}

export interface WeddingCreateData {
  partner1_name: string;
  partner2_name: string;
  couple_email?: string;
  wedding_date?: string;
  wedding_time?: string;
  dress_code?: string;
  ceremony_venue_name?: string;
  ceremony_venue_address?: string;
  reception_venue_name?: string;
  reception_venue_address?: string;
  reception_time?: string;
  rsvp_deadline?: string;
}

/**
 * Get the current user's wedding.
 */
export async function getMyWedding(token: string): Promise<WeddingData> {
  const response = await fetch(`${API_URL}/api/wedding/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get wedding');
  }

  return response.json();
}

/**
 * Create a wedding for the current user.
 */
export async function createMyWedding(token: string, data: WeddingCreateData): Promise<{ id: string; access_code: string; chat_url: string }> {
  const response = await fetch(`${API_URL}/api/wedding/me`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create wedding');
  }

  return response.json();
}

/**
 * Update the current user's wedding.
 */
export async function updateMyWedding(token: string, data: Partial<WeddingCreateData>): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update wedding');
  }

  return response.json();
}

// ============ EVENT API ============

export interface EventCreateData {
  event_name: string;
  event_date?: string;
  event_time?: string;
  venue_name?: string;
  venue_address?: string;
  description?: string;
  dress_code?: string;
}

export async function createEvent(token: string, weddingId: string, data: EventCreateData): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create event');
  }

  return response.json();
}

export async function updateEvent(token: string, weddingId: string, eventId: string, data: Partial<EventCreateData>): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update event');
  }

  return response.json();
}

export async function deleteEvent(token: string, weddingId: string, eventId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete event');
  }

  return response.json();
}

// ============ ACCOMMODATION API ============

export interface AccommodationCreateData {
  hotel_name: string;
  address?: string;
  phone?: string;
  website_url?: string;
  booking_url?: string;
  has_room_block?: boolean;
  room_block_name?: string;
  room_block_code?: string;
  room_block_rate?: string;
  room_block_deadline?: string;
  distance_to_venue?: string;
  notes?: string;
}

export async function createAccommodation(token: string, weddingId: string, data: AccommodationCreateData): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/accommodations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create accommodation');
  }

  return response.json();
}

export async function updateAccommodation(token: string, weddingId: string, accId: string, data: Partial<AccommodationCreateData>): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/accommodations/${accId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update accommodation');
  }

  return response.json();
}

export async function deleteAccommodation(token: string, weddingId: string, accId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/accommodations/${accId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete accommodation');
  }

  return response.json();
}

// ============ FAQ API ============

export interface FAQCreateData {
  question: string;
  answer: string;
  category?: string;
}

export async function createFAQ(token: string, weddingId: string, data: FAQCreateData): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/faqs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create FAQ');
  }

  return response.json();
}

export async function updateFAQ(token: string, weddingId: string, faqId: string, data: Partial<FAQCreateData>): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/faqs/${faqId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update FAQ');
  }

  return response.json();
}

export async function deleteFAQ(token: string, weddingId: string, faqId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/faqs/${faqId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete FAQ');
  }

  return response.json();
}

// ============ SCRAPE API ============

export interface ScrapeEvent {
  name: string;
  date: string | null;
  time: string | null;
  description: string | null;
  venue_name: string | null;
  venue_address: string | null;
  dress_code: string | null;
}

export interface ScrapeAccommodation {
  name: string;
  address: string | null;
  phone: string | null;
  booking_url: string | null;
  room_block_name: string | null;
  room_block_code: string | null;
}

export interface ScrapeFAQ {
  question: string;
  answer: string;
}

export interface ScrapePreview {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  ceremony_venue: string | null;
  ceremony_venue_address: string | null;
  reception_venue: string | null;
  reception_venue_address: string | null;
  dress_code: string | null;
  events_count: number;
  accommodations_count: number;
  faqs_count: number;
  has_registry: boolean;
  events: ScrapeEvent[];
  accommodations: ScrapeAccommodation[];
  faqs: ScrapeFAQ[];
}

export interface ScrapeResponse {
  success: boolean;
  platform: string | null;
  data: Record<string, unknown>;
  preview: ScrapePreview;
  message: string;
}

export interface ImportResponse {
  success: boolean;
  wedding_id: string;
  access_code: string;
  chat_url: string;
  message: string;
}

/**
 * Scrape a wedding website and get preview of extracted data.
 */
export async function scrapeWeddingWebsite(url: string): Promise<ScrapeResponse> {
  const response = await fetch(`${API_URL}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to scrape website');
  }

  return response.json();
}

/**
 * Import a wedding from a website URL.
 * If data is provided, uses pre-scraped data (fast path).
 * If token is provided, links the wedding to the user's account.
 */
export async function importWeddingFromUrl(url: string, token?: string, data?: Record<string, unknown>): Promise<ImportResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/scrape/import`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, data }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to import wedding');
  }

  return response.json();
}

// ============ BACKGROUND SCRAPE JOB API ============

export interface StartScrapeResponse {
  job_id: string;
  message: string;
}

export interface ScrapeJobStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string | null;
  // Results (only present when completed)
  platform?: string | null;
  data?: Record<string, unknown> | null;
  preview?: ScrapePreview | null;
  // Error (only present when failed)
  error?: string | null;
}

/**
 * Start a background scrape job. Returns immediately with a job ID.
 * Use getScrapeJobStatus to poll for progress and results.
 */
export async function startScrapeJob(url: string): Promise<StartScrapeResponse> {
  const response = await fetch(`${API_URL}/api/scrape/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start scrape job');
  }

  return response.json();
}

/**
 * Get the status of a background scrape job.
 * Returns progress updates while running, full results when complete.
 */
export async function getScrapeJobStatus(jobId: string): Promise<ScrapeJobStatus> {
  const response = await fetch(`${API_URL}/api/scrape/status/${jobId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get job status');
  }

  return response.json();
}

// ============ GUEST API ============

export interface Guest {
  id: string;
  name: string;
  phone_number: string;
  email: string | null;
  group_name: string | null;
  rsvp_status: string;
  sms_consent: boolean;
  opted_out: boolean;
  created_at: string;
}

export interface GuestCreateData {
  name: string;
  phone_number: string;
  email?: string;
  group_name?: string;
  rsvp_status?: string;
}

export async function getGuests(token: string, weddingId: string): Promise<Guest[]> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/guests`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get guests');
  }

  return response.json();
}

export async function createGuest(token: string, weddingId: string, data: GuestCreateData): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/guests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create guest');
  }

  return response.json();
}

export async function uploadGuests(token: string, weddingId: string, file: File): Promise<{ message: string; added: number; skipped: number; errors: string[] }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/guests/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload guests');
  }

  return response.json();
}

export async function updateGuest(token: string, weddingId: string, guestId: string, data: Partial<GuestCreateData>): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/guests/${guestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update guest');
  }

  return response.json();
}

export async function deleteGuest(token: string, weddingId: string, guestId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/guests/${guestId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete guest');
  }

  return response.json();
}

// ============ SMS TEMPLATE API ============

export interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  is_default: boolean;
  created_at: string;
}

export interface TemplateCreateData {
  name: string;
  content: string;
  category?: string;
}

export async function getTemplates(token: string, weddingId: string): Promise<SMSTemplate[]> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/templates`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get templates');
  }

  return response.json();
}

export async function getTemplateVariables(): Promise<Array<{ name: string; description: string }>> {
  const response = await fetch(`${API_URL}/api/wedding/templates/variables`);

  if (!response.ok) {
    throw new Error('Failed to get template variables');
  }

  return response.json();
}

export async function createTemplate(token: string, weddingId: string, data: TemplateCreateData): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create template');
  }

  return response.json();
}

export async function updateTemplate(token: string, weddingId: string, templateId: string, data: Partial<TemplateCreateData>): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/templates/${templateId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update template');
  }

  return response.json();
}

export async function deleteTemplate(token: string, weddingId: string, templateId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/templates/${templateId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete template');
  }

  return response.json();
}

// ============ SMS CAMPAIGN API ============

export interface ScheduledMessage {
  id: string;
  name: string;
  message_content: string;
  recipient_type: string;
  schedule_type: string;
  scheduled_at: string | null;
  relative_to: string | null;
  relative_days: number | null;
  status: string;
  sent_count: number;
  failed_count: number;
  total_recipients: number;
  created_at: string;
}

export interface SMSBlastData {
  message: string;
  recipient_type?: string;
  recipient_filter?: Record<string, unknown>;
}

export interface ScheduleMessageData {
  name: string;
  message: string;
  recipient_type?: string;
  recipient_filter?: Record<string, unknown>;
  schedule_type: string;
  scheduled_at?: string;
  relative_to?: string;
  relative_days?: number;
}

export async function sendSMSBlast(token: string, weddingId: string, data: SMSBlastData): Promise<{ message: string; sent: number; failed: number; scheduled_message_id: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/sms/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send SMS blast');
  }

  return response.json();
}

export async function scheduleMessage(token: string, weddingId: string, data: ScheduleMessageData): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/sms/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to schedule message');
  }

  return response.json();
}

export async function getScheduledMessages(token: string, weddingId: string): Promise<ScheduledMessage[]> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/sms/scheduled`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get scheduled messages');
  }

  return response.json();
}

export async function cancelScheduledMessage(token: string, weddingId: string, messageId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/sms/scheduled/${messageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to cancel scheduled message');
  }

  return response.json();
}

export interface MessageLog {
  id: string;
  guest_id: string;
  phone_number: string;
  message_content: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
}

export async function getSMSHistory(token: string, weddingId: string, limit: number = 100): Promise<MessageLog[]> {
  const response = await fetch(`${API_URL}/api/wedding/${weddingId}/sms/history?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get SMS history');
  }

  return response.json();
}

// ============ CONTACT API ============

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
  wedding_date?: string;
}

export async function submitContactForm(data: ContactFormData): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send message');
  }

  return response.json();
}

// ============ VENDOR API ============

export const VENDOR_CATEGORIES = [
  { value: 'venue', label: 'Venue' },
  { value: 'catering', label: 'Catering' },
  { value: 'photography', label: 'Photography' },
  { value: 'videography', label: 'Videography' },
  { value: 'florist', label: 'Florist' },
  { value: 'dj_band', label: 'DJ/Band' },
  { value: 'officiant', label: 'Officiant' },
  { value: 'hair_makeup', label: 'Hair & Makeup' },
  { value: 'cake_desserts', label: 'Cake & Desserts' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'rentals', label: 'Rentals' },
  { value: 'lighting_av', label: 'Lighting/AV' },
  { value: 'photo_booth', label: 'Photo Booth' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'planner_coordinator', label: 'Planner/Coordinator' },
  { value: 'other', label: 'Other' },
] as const;

export const VENDOR_STATUSES = [
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'deposit_paid', label: 'Deposit Paid' },
  { value: 'booked', label: 'Booked' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const PAYMENT_TYPES = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'installment', label: 'Installment' },
  { value: 'final', label: 'Final Payment' },
  { value: 'tip', label: 'Tip' },
  { value: 'refund', label: 'Refund' },
  { value: 'other', label: 'Other' },
] as const;

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export interface Vendor {
  id: string;
  wedding_id: string;
  business_name: string;
  category: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  instagram_handle: string | null;
  status: string;
  contract_amount: number | null;
  notes: string | null;
  service_description: string | null;
  service_date: string | null;
  service_start_time: string | null;
  service_end_time: string | null;
  created_at: string;
  updated_at: string;
  payments: VendorPayment[];
  communications: VendorCommunication[];
}

export interface VendorPayment {
  id: string;
  vendor_id: string;
  payment_type: string;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

export interface VendorCommunication {
  id: string;
  vendor_id: string;
  communication_type: string;
  subject: string | null;
  content: string;
  communication_date: string;
  created_at: string;
}

export interface VendorCreateData {
  business_name: string;
  category: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  instagram_handle?: string;
  status?: string;
  contract_amount?: number;
  notes?: string;
  service_description?: string;
  service_date?: string;
  service_start_time?: string;
  service_end_time?: string;
}

export interface VendorPaymentCreateData {
  payment_type: string;
  amount: number;
  due_date?: string;
  paid_date?: string;
  status?: string;
  payment_method?: string;
  notes?: string;
}

export interface VendorCommunicationCreateData {
  communication_type: string;
  subject?: string;
  content: string;
  communication_date?: string;
}

export interface VendorSummary {
  summary: {
    total_vendors: number;
    total_contract: number;
    total_paid: number;
    balance_due: number;
    percent_paid: number;
  };
  by_category: Record<string, { count: number; total: number; paid: number }>;
  upcoming_payments: Array<{
    vendor_name: string;
    vendor_id: string;
    payment_id: string;
    description: string;
    amount: number;
    due_date: string;
  }>;
  overdue_payments: Array<{
    vendor_name: string;
    vendor_id: string;
    payment_id: string;
    description: string;
    amount: number;
    due_date: string;
  }>;
}

/**
 * Get all vendors for a wedding.
 */
export async function getVendors(
  token: string,
  weddingId: string,
  category?: string,
  status?: string
): Promise<Vendor[]> {
  const params = new URLSearchParams();
  params.append('wedding_id', weddingId);
  if (category) params.append('category', category);
  if (status) params.append('status', status);

  const response = await fetch(`${API_URL}/api/vendors?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get vendors');
  }

  const data = await response.json();
  return data.vendors || [];
}

/**
 * Get a single vendor by ID.
 */
export async function getVendor(token: string, vendorId: string): Promise<Vendor> {
  const response = await fetch(`${API_URL}/api/vendors/${vendorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get vendor');
  }

  return response.json();
}

/**
 * Create a new vendor.
 */
export async function createVendor(
  token: string,
  weddingId: string,
  data: VendorCreateData
): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/vendors?wedding_id=${weddingId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create vendor');
  }

  return response.json();
}

/**
 * Update an existing vendor.
 */
export async function updateVendor(
  token: string,
  vendorId: string,
  data: Partial<VendorCreateData>
): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/vendors/${vendorId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update vendor');
  }

  return response.json();
}

/**
 * Delete a vendor.
 */
export async function deleteVendor(token: string, vendorId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/vendors/${vendorId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete vendor');
  }

  return response.json();
}

/**
 * Get vendor summary/dashboard data for a wedding.
 */
export async function getVendorSummary(token: string, weddingId: string): Promise<VendorSummary> {
  const response = await fetch(`${API_URL}/api/vendors/summary/all?wedding_id=${weddingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get vendor summary');
  }

  return response.json();
}

/**
 * Extracted contract data from AI analysis.
 */
export interface ExtractedContractData {
  business_name?: string;
  category?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  contract_amount?: number;
  deposit_amount?: number;
  service_description?: string;
  service_date?: string;
  payment_schedule?: Array<{
    description: string;
    amount: number;
    due_date: string;
  }>;
  notes?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Upload a contract and extract vendor data using AI.
 */
export async function extractContractData(
  token: string,
  file: File
): Promise<{ success: boolean; extracted_data: ExtractedContractData; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/vendors/extract-contract`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to extract contract data');
  }

  return response.json();
}

/**
 * Add a payment to a vendor.
 */
export async function createVendorPayment(
  token: string,
  vendorId: string,
  data: VendorPaymentCreateData
): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/vendors/${vendorId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add payment');
  }

  return response.json();
}

/**
 * Update a vendor payment.
 */
export async function updateVendorPayment(
  token: string,
  vendorId: string,
  paymentId: string,
  data: Partial<VendorPaymentCreateData>
): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/vendors/${vendorId}/payments/${paymentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update payment');
  }

  return response.json();
}

/**
 * Delete a vendor payment.
 */
export async function deleteVendorPayment(
  token: string,
  vendorId: string,
  paymentId: string
): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/vendors/${vendorId}/payments/${paymentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete payment');
  }

  return response.json();
}

/**
 * Add a communication log to a vendor.
 */
export async function createVendorCommunication(
  token: string,
  vendorId: string,
  data: VendorCommunicationCreateData
): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_URL}/api/vendors/${vendorId}/communications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add communication');
  }

  return response.json();
}

// ============ PAYMENT API ============

export interface PaymentConfig {
  stripe_publishable_key: string | null;
  stripe_enabled: boolean;
  pricing: {
    [key: string]: {
      name: string;
      price_cents: number;
      price_display: string;
      features: {
        chat_enabled: boolean;
        chat_limit: number | null;
        sms_enabled: boolean;
        vendors_enabled: boolean;
        branding_removable: boolean;
        qr_codes: boolean;
        priority_support?: boolean;
        custom_domain?: boolean;
      };
    };
  };
}

export interface PaymentStatus {
  subscription_tier: string;
  is_paid: boolean;
  paid_at: string | null;
  features: {
    chat_enabled: boolean;
    chat_limit: number | null;
    sms_enabled: boolean;
    vendors_enabled: boolean;
    branding_removable: boolean;
    qr_codes: boolean;
    priority_support?: boolean;
    custom_domain?: boolean;
  };
}

export interface CheckoutSession {
  checkout_url: string;
  session_id: string;
}

/**
 * Get Stripe configuration and pricing info (public, no auth).
 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  const response = await fetch(`${API_URL}/api/payment/config`);

  if (!response.ok) {
    throw new Error('Failed to get payment config');
  }

  return response.json();
}

/**
 * Get current user's payment status.
 */
export async function getPaymentStatus(token: string): Promise<PaymentStatus> {
  const response = await fetch(`${API_URL}/api/payment/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get payment status');
  }

  return response.json();
}

/**
 * Create a Stripe checkout session for payment.
 */
export async function createCheckoutSession(
  token: string,
  tier: 'standard' | 'premium',
  successUrl?: string,
  cancelUrl?: string
): Promise<CheckoutSession> {
  const response = await fetch(`${API_URL}/api/payment/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      tier,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create checkout session');
  }

  return response.json();
}

/**
 * Verify a checkout session after returning from Stripe.
 */
export async function verifyCheckoutSession(
  token: string,
  sessionId: string
): Promise<{ status: string; tier?: string; message: string }> {
  const response = await fetch(`${API_URL}/api/payment/verify-session/${sessionId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to verify session');
  }

  return response.json();
}

// ============ PUBLIC API (No Auth Required) ============

export interface PublicWeddingInfo {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  access_code: string;
  show_branding: boolean;
}

export interface GuestRegistrationData {
  name: string;
  phone_number: string;
  email?: string;
}

export interface GuestRegistrationResponse {
  success: boolean;
  message: string;
  chat_url: string;
  guest_id?: string;
  guest_name?: string;
  already_registered: boolean;
}

/**
 * Get public wedding info by slug (for guest registration page).
 */
export async function getPublicWeddingBySlug(slug: string): Promise<PublicWeddingInfo> {
  const response = await fetch(`${API_URL}/api/public/wedding/${encodeURIComponent(slug)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Wedding not found');
  }

  return response.json();
}

/**
 * Register a guest for a wedding (public, no auth required).
 */
export async function registerGuest(
  slug: string,
  data: GuestRegistrationData
): Promise<GuestRegistrationResponse> {
  const response = await fetch(`${API_URL}/api/public/wedding/${encodeURIComponent(slug)}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to register');
  }

  return response.json();
}

/**
 * Register a guest for a wedding using access code (for chat widget).
 */
export async function registerGuestByAccessCode(
  accessCode: string,
  data: GuestRegistrationData
): Promise<GuestRegistrationResponse> {
  const response = await fetch(`${API_URL}/api/public/wedding/by-access-code/${encodeURIComponent(accessCode)}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to register');
  }

  return response.json();
}

export interface GuestVerifyResponse {
  valid: boolean;
  guest_id: string;
  guest_name: string;
  phone_number: string | null;  // Last 4 digits only
}

/**
 * Verify a guest ID is valid (for returning guests).
 */
export async function verifyGuest(guestId: string): Promise<GuestVerifyResponse> {
  const response = await fetch(`${API_URL}/api/public/guest/${encodeURIComponent(guestId)}/verify`);

  if (!response.ok) {
    throw new Error('Guest not found');
  }

  return response.json();
}

// ============ ANALYTICS API ============

export interface ChatSessionSummary {
  id: string;
  guest_name: string | null;
  channel: string;
  message_count: number;
  topics: string[];  // Privacy-friendly topic tags instead of full messages
  created_at: string;
  last_message_at: string;
}

export interface AnalyticsData {
  total_sessions: number;
  total_messages: number;
  unique_guests: number;
  web_sessions: number;
  sms_sessions: number;
  topic_breakdown: Record<string, number>;  // Topic counts for insights
  recent_sessions: ChatSessionSummary[];
}

/**
 * Get analytics data for the user's wedding.
 * Returns topic summaries instead of full transcripts for guest privacy.
 */
export async function getAnalytics(token: string): Promise<AnalyticsData> {
  const response = await fetch(`${API_URL}/api/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get analytics');
  }

  return response.json();
}

// Note: getChatTranscript removed for guest privacy.
// Couples now see topic summaries instead of full conversation transcripts.
