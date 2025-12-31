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
