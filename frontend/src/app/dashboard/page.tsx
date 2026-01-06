'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMyWedding,
  createMyWedding,
  updateMyWedding,
  createEvent,
  updateEvent,
  deleteEvent,
  createAccommodation,
  updateAccommodation,
  deleteAccommodation,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getPaymentStatus,
  WeddingData,
  WeddingCreateData,
  EventCreateData,
  AccommodationCreateData,
  FAQCreateData,
  PaymentStatus,
} from '@/lib/api';

// Format date string without timezone conversion
// Parses "YYYY-MM-DD" directly to avoid JavaScript Date's UTC interpretation
function formatDateString(dateStr: string): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Parse YYYY-MM-DD format
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]) - 1; // 0-indexed
    const day = parseInt(match[3]);

    // Create date at noon local time to avoid any timezone edge cases
    const date = new Date(year, month, day, 12, 0, 0);
    const weekday = days[date.getDay()];
    const monthName = months[month];

    return `${weekday}, ${monthName} ${day}, ${year}`;
  }

  // Fallback: return as-is if format doesn't match
  return dateStr;
}
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SMSManager from '@/components/SMSManager';
import VendorManager from '@/components/VendorManager';
import VendorBudgetSummary from '@/components/VendorBudgetSummary';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

// Modal types
type ModalType = 'wedding' | 'event' | 'accommodation' | 'faq' | null;

interface EditingItem {
  type: ModalType;
  data: Record<string, unknown> | null; // null for new items
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, logout } = useAuth();

  const [wedding, setWedding] = useState<WeddingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);

  // Form state for creating wedding
  const [formData, setFormData] = useState<WeddingCreateData>({
    partner1_name: '',
    partner2_name: '',
    wedding_date: '',
    dress_code: '',
    ceremony_venue_name: '',
    ceremony_venue_address: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'outreach' | 'vendors' | 'analytics'>('details');

  // Modal state for editing
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Load wedding data and payment status
  useEffect(() => {
    async function loadData() {
      if (!token) return;

      try {
        const [weddingData, paymentData] = await Promise.all([
          getMyWedding(token).catch(() => null),
          getPaymentStatus(token).catch(() => null),
        ]);
        setWedding(weddingData);
        setPaymentStatus(paymentData);
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      loadData();
    }
  }, [token]);

  const handleCreateWedding = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      await createMyWedding(token, formData);
      // Reload wedding data
      const data = await getMyWedding(token);
      setWedding(data);
      setShowCreateForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create wedding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = () => {
    if (wedding) {
      const link = `${window.location.origin}/chat/${wedding.access_code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Reload wedding data
  const reloadWedding = async () => {
    if (!token) return;
    try {
      const data = await getMyWedding(token);
      setWedding(data);
    } catch {
      // Ignore errors
    }
  };

  // Open edit modal
  const openModal = (type: ModalType, data: Record<string, unknown> | null = null) => {
    setEditingItem({ type, data });
    setModalError(null);
  };

  // Close modal
  const closeModal = () => {
    setEditingItem(null);
    setModalError(null);
  };

  // Save wedding info
  const handleSaveWedding = async (data: Partial<WeddingCreateData>) => {
    if (!token || !wedding) return;
    setIsSaving(true);
    setModalError(null);
    try {
      await updateMyWedding(token, data);
      await reloadWedding();
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Save event
  const handleSaveEvent = async (data: EventCreateData, eventId?: string) => {
    if (!token || !wedding) return;
    setIsSaving(true);
    setModalError(null);
    try {
      if (eventId) {
        await updateEvent(token, wedding.id, eventId, data);
      } else {
        await createEvent(token, wedding.id, data);
      }
      await reloadWedding();
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!token || !wedding) return;
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteEvent(token, wedding.id, eventId);
      await reloadWedding();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // Save accommodation
  const handleSaveAccommodation = async (data: AccommodationCreateData, accId?: string) => {
    if (!token || !wedding) return;
    setIsSaving(true);
    setModalError(null);
    try {
      if (accId) {
        await updateAccommodation(token, wedding.id, accId, data);
      } else {
        await createAccommodation(token, wedding.id, data);
      }
      await reloadWedding();
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete accommodation
  const handleDeleteAccommodation = async (accId: string) => {
    if (!token || !wedding) return;
    if (!confirm('Are you sure you want to delete this accommodation?')) return;
    try {
      await deleteAccommodation(token, wedding.id, accId);
      await reloadWedding();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // Save FAQ
  const handleSaveFAQ = async (data: FAQCreateData, faqId?: string) => {
    if (!token || !wedding) return;
    setIsSaving(true);
    setModalError(null);
    try {
      if (faqId) {
        await updateFAQ(token, wedding.id, faqId, data);
      } else {
        await createFAQ(token, wedding.id, data);
      }
      await reloadWedding();
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete FAQ
  const handleDeleteFAQ = async (faqId: string) => {
    if (!token || !wedding) return;
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await deleteFAQ(token, wedding.id, faqId);
      await reloadWedding();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 flex-grow overflow-x-hidden">
        {!wedding && !showCreateForm ? (
          // No wedding yet - show welcome with options
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-serif text-gray-800 mb-3">Welcome to The Wedding Concierge!</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Create your wedding profile and get a shareable link for your guests to ask questions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {/* Primary: Import from website */}
              <Link
                href="/import"
                className="inline-flex items-center px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Wedding Website
              </Link>

              {/* Secondary: Manual entry */}
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Enter Details Manually
              </button>
            </div>
          </div>
        ) : !wedding && showCreateForm ? (
          // Create wedding form
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700 mb-6 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-serif text-gray-800 mb-6">Create Your Wedding</h2>

              <form onSubmit={handleCreateWedding} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Partner 1 Name *
                    </label>
                    <input
                      type="text"
                      value={formData.partner1_name}
                      onChange={(e) => setFormData({ ...formData, partner1_name: e.target.value })}
                      placeholder="e.g., Alice Smith"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Partner 2 Name *
                    </label>
                    <input
                      type="text"
                      value={formData.partner2_name}
                      onChange={(e) => setFormData({ ...formData, partner2_name: e.target.value })}
                      placeholder="e.g., Bob Jones"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wedding Date
                    </label>
                    <input
                      type="date"
                      value={formData.wedding_date}
                      onChange={(e) => setFormData({ ...formData, wedding_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dress Code
                    </label>
                    <input
                      type="text"
                      value={formData.dress_code}
                      onChange={(e) => setFormData({ ...formData, dress_code: e.target.value })}
                      placeholder="e.g., Black Tie, Cocktail"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ceremony Venue
                  </label>
                  <input
                    type="text"
                    value={formData.ceremony_venue_name}
                    onChange={(e) => setFormData({ ...formData, ceremony_venue_name: e.target.value })}
                    placeholder="e.g., The Grand Chapel"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue Address
                  </label>
                  <input
                    type="text"
                    value={formData.ceremony_venue_address}
                    onChange={(e) => setFormData({ ...formData, ceremony_venue_address: e.target.value })}
                    placeholder="e.g., 123 Wedding Lane, City, State 12345"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                {formError && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !formData.partner1_name || !formData.partner2_name}
                  className="w-full py-3 px-4 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Creating...' : 'Create Wedding'}
                </button>
              </form>
            </div>
          </div>
        ) : wedding ? (
          // Show wedding dashboard
          <div className="space-y-8">
            {/* Wedding header */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-serif text-gray-800">
                      {wedding.partner1_name} & {wedding.partner2_name}
                    </h1>
                    {/* Subscription tier badge */}
                    {paymentStatus && (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        paymentStatus.subscription_tier === 'premium'
                          ? 'bg-purple-100 text-purple-700'
                          : paymentStatus.subscription_tier === 'standard'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {paymentStatus.subscription_tier === 'premium' ? 'Premium' :
                         paymentStatus.subscription_tier === 'standard' ? 'Standard' : 'Free'}
                      </span>
                    )}
                  </div>
                  {wedding.wedding_date && (
                    <p className="text-gray-500 mt-1">
                      {formatDateString(wedding.wedding_date)}
                    </p>
                  )}
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-4">
                  <button
                    onClick={() => openModal('wedding', {
                      partner1_name: wedding.partner1_name,
                      partner2_name: wedding.partner2_name,
                      wedding_date: wedding.wedding_date,
                      rsvp_deadline: wedding.rsvp_deadline,
                      dress_code: wedding.dress_code,
                      ceremony_venue_name: wedding.ceremony?.venue_name,
                      ceremony_venue_address: wedding.ceremony?.address,
                      reception_venue_name: wedding.reception?.venue_name,
                      reception_venue_address: wedding.reception?.address,
                    })}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Details
                  </button>
                  {paymentStatus?.subscription_tier === 'free' && (
                    <Link
                      href="/pricing"
                      className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Upgrade
                    </Link>
                  )}
                  <Link
                    href={`/chat/${wedding.access_code}`}
                    target="_blank"
                    className="text-rose-600 hover:text-rose-700 text-sm font-medium"
                  >
                    Preview Chat
                  </Link>
                </div>
              </div>
            </div>

            {/* Share section with QR codes */}
            <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-2xl shadow-lg p-4 sm:p-8 text-white overflow-hidden">
              <h2 className="text-xl font-medium mb-2">Share with Your Guests</h2>
              <p className="text-rose-100 mb-4 break-words">
                Give your guests these links so they can ask questions about your wedding.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 bg-white/10 rounded-xl px-4 py-3 font-mono text-sm overflow-hidden text-ellipsis break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/chat/${wedding.access_code}` : `/chat/${wedding.access_code}`}
                </div>
                <button
                  onClick={copyLink}
                  className="px-6 py-3 bg-white text-rose-600 rounded-xl font-medium hover:bg-rose-50 transition-colors whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              {/* Generate QR Code Button */}
              <div className="mt-4">
                <Link
                  href={`/qr/${wedding.access_code}`}
                  target="_blank"
                  className="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Generate QR Code
                </Link>
              </div>

              <p className="text-rose-100 text-sm mt-4">
                Print QR codes on your save-the-dates, invitations, or display them at your welcome table.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 overflow-hidden">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-4 text-center font-medium transition-colors relative ${
                  activeTab === 'details'
                    ? 'text-rose-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="hidden sm:inline">Wedding Details</span>
                  <span className="sm:hidden text-xs ml-1">Details</span>
                </span>
                {activeTab === 'details' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('outreach')}
                className={`flex-1 py-4 text-center font-medium transition-colors relative ${
                  activeTab === 'outreach'
                    ? 'text-rose-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="hidden sm:inline">Guest Outreach</span>
                  <span className="sm:hidden text-xs ml-1">Outreach</span>
                </span>
                {activeTab === 'outreach' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('vendors')}
                className={`flex-1 py-4 text-center font-medium transition-colors relative ${
                  activeTab === 'vendors'
                    ? 'text-rose-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="hidden sm:inline">Vendors</span>
                  <span className="sm:hidden text-xs ml-1">Vendors</span>
                </span>
                {activeTab === 'vendors' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 py-4 text-center font-medium transition-colors relative ${
                  activeTab === 'analytics'
                    ? 'text-rose-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="hidden sm:inline">Analytics</span>
                  <span className="sm:hidden text-xs ml-1">Analytics</span>
                </span>
                {activeTab === 'analytics' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600" />
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
            <>
            {/* Wedding details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ceremony */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Ceremony
                  </h3>
                  <button
                    onClick={() => openModal('wedding', {
                      partner1_name: wedding.partner1_name,
                      partner2_name: wedding.partner2_name,
                      wedding_date: wedding.wedding_date,
                      rsvp_deadline: wedding.rsvp_deadline,
                      dress_code: wedding.dress_code,
                      ceremony_venue_name: wedding.ceremony?.venue_name,
                      ceremony_venue_address: wedding.ceremony?.address,
                      reception_venue_name: wedding.reception?.venue_name,
                      reception_venue_address: wedding.reception?.address,
                    })}
                    className="text-rose-600 hover:text-rose-700 text-sm font-medium"
                  >
                    + Edit
                  </button>
                </div>
                {wedding.ceremony ? (
                  <div className="space-y-2 text-gray-600">
                    <p className="font-medium text-gray-800">{wedding.ceremony.venue_name}</p>
                    <p className="text-sm">{wedding.ceremony.address}</p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No ceremony details added yet</p>
                )}
              </div>

              {/* Dress Code */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 8L4 16L10 12L4 8Z" />
                      <path d="M20 8L20 16L14 12L20 8Z" />
                      <rect x="10" y="10" width="4" height="4" rx="1" />
                    </svg>
                    Dress Code
                  </h3>
                  <button
                    onClick={() => openModal('wedding', {
                      partner1_name: wedding.partner1_name,
                      partner2_name: wedding.partner2_name,
                      wedding_date: wedding.wedding_date,
                      rsvp_deadline: wedding.rsvp_deadline,
                      dress_code: wedding.dress_code,
                      ceremony_venue_name: wedding.ceremony?.venue_name,
                      ceremony_venue_address: wedding.ceremony?.address,
                      reception_venue_name: wedding.reception?.venue_name,
                      reception_venue_address: wedding.reception?.address,
                    })}
                    className="text-rose-600 hover:text-rose-700 text-sm font-medium"
                  >
                    + Edit
                  </button>
                </div>
                {wedding.dress_code ? (
                  <p className="text-gray-800 font-medium">{wedding.dress_code}</p>
                ) : (
                  <p className="text-gray-400 text-sm">No dress code specified</p>
                )}
              </div>

              {/* Events */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Events ({wedding.events.length})
                  </h3>
                  <button
                    onClick={() => openModal('event', null)}
                    className="text-rose-600 hover:text-rose-700 text-sm font-medium"
                  >
                    + Add
                  </button>
                </div>
                {wedding.events.length > 0 ? (
                  <ul className="space-y-3">
                    {wedding.events.map((event) => (
                      <li key={event.id} className="flex items-start justify-between group">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{event.name}</p>
                          {event.date && (
                            <p className="text-sm text-gray-500">
                              {new Date(event.date).toLocaleDateString()}
                              {event.time && ` at ${event.time}`}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal('event', event)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">No events added yet</p>
                )}
              </div>

              {/* Accommodations */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Accommodations ({wedding.accommodations.length})
                  </h3>
                  <button
                    onClick={() => openModal('accommodation', null)}
                    className="text-rose-600 hover:text-rose-700 text-sm font-medium"
                  >
                    + Add
                  </button>
                </div>
                {wedding.accommodations.length > 0 ? (
                  <ul className="space-y-3">
                    {wedding.accommodations.map((acc) => (
                      <li key={acc.id} className="flex items-start justify-between group">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{acc.hotel_name}</p>
                          {acc.has_room_block && (
                            <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
                              Room Block
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal('accommodation', acc)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteAccommodation(acc.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">No accommodations added yet</p>
                )}
              </div>

              {/* FAQs */}
              <div className="bg-white rounded-2xl shadow-lg p-6 md:col-span-2 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    FAQs ({wedding.faqs.length})
                  </h3>
                  <button
                    onClick={() => openModal('faq', null)}
                    className="text-rose-600 hover:text-rose-700 text-sm font-medium"
                  >
                    + Add
                  </button>
                </div>
                {wedding.faqs.length > 0 ? (
                  <ul className="space-y-4">
                    {wedding.faqs.map((faq) => (
                      <li key={faq.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0 group">
                        <div className="flex justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 break-words">{faq.question}</p>
                            <p className="text-sm text-gray-600 mt-1 break-words">{faq.answer}</p>
                          </div>
                          <div className="flex gap-2 ml-4 flex-shrink-0">
                            <button
                              onClick={() => openModal('faq', faq)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteFAQ(faq.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">No FAQs added yet. Add common questions your guests might ask.</p>
                )}
              </div>
            </div>
            </>
            )}

            {/* Guest Outreach Tab */}
            {activeTab === 'outreach' && (
              <div className="space-y-6">
                <SMSManager token={token!} weddingId={wedding.id} />
              </div>
            )}

            {/* Vendors Tab */}
            {activeTab === 'vendors' && (
              <div className="space-y-6">
                <VendorBudgetSummary token={token!} weddingId={wedding.id} />
                <VendorManager token={token!} weddingId={wedding.id} />
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <AnalyticsDashboard token={token!} />
              </div>
            )}
          </div>
        ) : null}
      </main>

      <Footer />

      {/* Edit Wedding Modal */}
      {editingItem?.type === 'wedding' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-serif text-gray-800 mb-6">Edit Wedding Details</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                handleSaveWedding({
                  partner1_name: formData.get('partner1_name') as string,
                  partner2_name: formData.get('partner2_name') as string,
                  wedding_date: formData.get('wedding_date') as string || undefined,
                  rsvp_deadline: formData.get('rsvp_deadline') as string || undefined,
                  dress_code: formData.get('dress_code') as string || undefined,
                  ceremony_venue_name: formData.get('ceremony_venue_name') as string || undefined,
                  ceremony_venue_address: formData.get('ceremony_venue_address') as string || undefined,
                  reception_venue_name: formData.get('reception_venue_name') as string || undefined,
                  reception_venue_address: formData.get('reception_venue_address') as string || undefined,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Partner 1 Name</label>
                  <input
                    name="partner1_name"
                    defaultValue={editingItem.data?.partner1_name as string || ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Partner 2 Name</label>
                  <input
                    name="partner2_name"
                    defaultValue={editingItem.data?.partner2_name as string || ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wedding Date</label>
                  <input
                    type="date"
                    name="wedding_date"
                    defaultValue={editingItem.data?.wedding_date as string || ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RSVP Deadline</label>
                  <input
                    type="date"
                    name="rsvp_deadline"
                    defaultValue={editingItem.data?.rsvp_deadline as string || ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dress Code</label>
                <input
                  name="dress_code"
                  defaultValue={editingItem.data?.dress_code as string || ''}
                  placeholder="e.g., Black Tie"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ceremony Venue</label>
                <input
                  name="ceremony_venue_name"
                  defaultValue={editingItem.data?.ceremony_venue_name as string || ''}
                  placeholder="Venue name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ceremony Address</label>
                <input
                  name="ceremony_venue_address"
                  defaultValue={editingItem.data?.ceremony_venue_address as string || ''}
                  placeholder="Full address"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reception Venue</label>
                <input
                  name="reception_venue_name"
                  defaultValue={editingItem.data?.reception_venue_name as string || ''}
                  placeholder="Venue name (if different)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reception Address</label>
                <input
                  name="reception_venue_address"
                  defaultValue={editingItem.data?.reception_venue_address as string || ''}
                  placeholder="Full address"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingItem?.type === 'event' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-serif text-gray-800 mb-6">
              {editingItem.data ? 'Edit Event' : 'Add Event'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                handleSaveEvent(
                  {
                    event_name: formData.get('event_name') as string,
                    event_date: formData.get('event_date') as string || undefined,
                    event_time: formData.get('event_time') as string || undefined,
                    venue_name: formData.get('venue_name') as string || undefined,
                    venue_address: formData.get('venue_address') as string || undefined,
                    description: formData.get('description') as string || undefined,
                    dress_code: formData.get('dress_code') as string || undefined,
                  },
                  editingItem.data?.id as string | undefined
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                <input
                  name="event_name"
                  defaultValue={editingItem.data?.name as string || ''}
                  placeholder="e.g., Welcome Dinner"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="event_date"
                    defaultValue={editingItem.data?.date as string || ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    name="event_time"
                    defaultValue={editingItem.data?.time as string || ''}
                    placeholder="e.g., 6:00 PM"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <input
                  name="venue_name"
                  defaultValue={editingItem.data?.venue_name as string || ''}
                  placeholder="Venue name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  name="venue_address"
                  defaultValue={editingItem.data?.venue_address as string || ''}
                  placeholder="Full address"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingItem.data?.description as string || ''}
                  placeholder="Event details..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dress Code</label>
                <input
                  name="dress_code"
                  defaultValue={editingItem.data?.dress_code as string || ''}
                  placeholder="e.g., Casual"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingItem.data ? 'Save Changes' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Accommodation Modal */}
      {editingItem?.type === 'accommodation' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-serif text-gray-800 mb-6">
              {editingItem.data ? 'Edit Accommodation' : 'Add Accommodation'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                handleSaveAccommodation(
                  {
                    hotel_name: formData.get('hotel_name') as string,
                    address: formData.get('address') as string || undefined,
                    phone: formData.get('phone') as string || undefined,
                    booking_url: formData.get('booking_url') as string || undefined,
                    has_room_block: formData.get('has_room_block') === 'on',
                    room_block_name: formData.get('room_block_name') as string || undefined,
                    room_block_code: formData.get('room_block_code') as string || undefined,
                    room_block_rate: formData.get('room_block_rate') as string || undefined,
                    notes: formData.get('notes') as string || undefined,
                  },
                  editingItem.data?.id as string | undefined
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name *</label>
                <input
                  name="hotel_name"
                  defaultValue={editingItem.data?.hotel_name as string || ''}
                  placeholder="e.g., Marriott Downtown"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  name="address"
                  defaultValue={editingItem.data?.address as string || ''}
                  placeholder="Full address"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    name="phone"
                    defaultValue={editingItem.data?.phone as string || ''}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking URL</label>
                  <input
                    name="booking_url"
                    defaultValue={editingItem.data?.booking_url as string || ''}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="has_room_block"
                  id="has_room_block"
                  defaultChecked={editingItem.data?.has_room_block as boolean || false}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                />
                <label htmlFor="has_room_block" className="text-sm text-gray-700">Has room block</label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Block Name</label>
                  <input
                    name="room_block_name"
                    defaultValue={editingItem.data?.room_block_name as string || ''}
                    placeholder="Smith-Jones Wedding"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Block Code</label>
                  <input
                    name="room_block_code"
                    defaultValue={editingItem.data?.room_block_code as string || ''}
                    placeholder="SMITHJONES2024"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Rate</label>
                <input
                  name="room_block_rate"
                  defaultValue={editingItem.data?.room_block_rate as string || ''}
                  placeholder="e.g., $149/night"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  defaultValue={editingItem.data?.notes as string || ''}
                  placeholder="Additional info for guests..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingItem.data ? 'Save Changes' : 'Add Accommodation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit FAQ Modal */}
      {editingItem?.type === 'faq' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-serif text-gray-800 mb-6">
              {editingItem.data ? 'Edit FAQ' : 'Add FAQ'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                handleSaveFAQ(
                  {
                    question: formData.get('question') as string,
                    answer: formData.get('answer') as string,
                    category: formData.get('category') as string || undefined,
                  },
                  editingItem.data?.id as string | undefined
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                <input
                  name="question"
                  defaultValue={editingItem.data?.question as string || ''}
                  placeholder="e.g., What time should I arrive?"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer *</label>
                <textarea
                  name="answer"
                  defaultValue={editingItem.data?.answer as string || ''}
                  placeholder="Your answer..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  name="category"
                  defaultValue={editingItem.data?.category as string || ''}
                  placeholder="e.g., Logistics, Dress Code"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
              {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingItem.data ? 'Save Changes' : 'Add FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
