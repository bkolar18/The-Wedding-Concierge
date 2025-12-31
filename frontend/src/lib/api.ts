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
  additional_notes: string | null;
  access_code: string;
  chat_url: string;
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

export interface ScrapePreview {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  ceremony_venue: string | null;
  reception_venue: string | null;
  dress_code: string | null;
  events_count: number;
  accommodations_count: number;
  has_registry: boolean;
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
 * Import a wedding from a website URL (scrape and create wedding).
 * If token is provided, links the wedding to the user's account.
 */
export async function importWeddingFromUrl(url: string, token?: string): Promise<ImportResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/scrape/import`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to import wedding');
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
