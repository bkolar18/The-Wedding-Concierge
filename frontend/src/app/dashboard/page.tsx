'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getMyWedding, createMyWedding, WeddingData, WeddingCreateData } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, logout } = useAuth();

  const [wedding, setWedding] = useState<WeddingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Load wedding data
  useEffect(() => {
    async function loadWedding() {
      if (!token) return;

      try {
        const data = await getMyWedding(token);
        setWedding(data);
      } catch (err) {
        // No wedding yet is fine
        setWedding(null);
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      loadWedding();
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

      <main className="max-w-5xl mx-auto px-4 py-8 flex-grow">
        {!wedding && !showCreateForm ? (
          // No wedding yet - show welcome
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
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your Wedding
            </button>
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
                  <h1 className="text-2xl font-serif text-gray-800">
                    {wedding.partner1_name} & {wedding.partner2_name}
                  </h1>
                  {wedding.wedding_date && (
                    <p className="text-gray-500 mt-1">
                      {new Date(wedding.wedding_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
                <div className="mt-4 md:mt-0">
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

            {/* Share link section */}
            <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-2xl shadow-lg p-8 text-white">
              <h2 className="text-xl font-medium mb-2">Share with Your Guests</h2>
              <p className="text-rose-100 mb-4">
                Give your guests this link so they can ask questions about your wedding.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-white/10 rounded-xl px-4 py-3 font-mono text-sm truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/chat/${wedding.access_code}` : `/chat/${wedding.access_code}`}
                </div>
                <button
                  onClick={copyLink}
                  className="px-6 py-3 bg-white text-rose-600 rounded-xl font-medium hover:bg-rose-50 transition-colors whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            {/* Wedding details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ceremony */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Ceremony
                </h3>
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
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Dress Code
                </h3>
                {wedding.dress_code ? (
                  <p className="text-gray-800 font-medium">{wedding.dress_code}</p>
                ) : (
                  <p className="text-gray-400 text-sm">No dress code specified</p>
                )}
              </div>

              {/* Accommodations */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Accommodations ({wedding.accommodations.length})
                </h3>
                {wedding.accommodations.length > 0 ? (
                  <ul className="space-y-2">
                    {wedding.accommodations.map((acc) => (
                      <li key={acc.id} className="text-gray-600 text-sm">
                        <span className="font-medium text-gray-800">{acc.hotel_name}</span>
                        {acc.has_room_block && (
                          <span className="ml-2 text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
                            Room Block
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">No accommodations added yet</p>
                )}
              </div>

              {/* FAQs */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  FAQs ({wedding.faqs.length})
                </h3>
                {wedding.faqs.length > 0 ? (
                  <ul className="space-y-2">
                    {wedding.faqs.slice(0, 3).map((faq) => (
                      <li key={faq.id} className="text-gray-600 text-sm truncate">
                        {faq.question}
                      </li>
                    ))}
                    {wedding.faqs.length > 3 && (
                      <li className="text-rose-500 text-sm">
                        +{wedding.faqs.length - 3} more
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">No FAQs added yet</p>
                )}
              </div>
            </div>

            {/* Coming soon note */}
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-gray-500 text-sm">
                More editing features coming soon! For now, you can manage your wedding details via our API.
              </p>
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
