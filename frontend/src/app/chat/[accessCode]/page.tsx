'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getWeddingPreview, WeddingPreview } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import ChatWidget from '@/components/chat/ChatWidget';

export default function WeddingChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const accessCode = params.accessCode as string;
  const isEmbed = searchParams.get('embed') === 'true';
  const { user } = useAuth();

  const [wedding, setWedding] = useState<WeddingPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchWedding() {
      try {
        const data = await getWeddingPreview(accessCode);
        setWedding(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load wedding');
      } finally {
        setLoading(false);
      }
    }

    if (accessCode) {
      fetchWedding();
    }
  }, [accessCode]);

  // Format wedding date for display without timezone conversion
  // Parses "YYYY-MM-DD" directly to avoid JavaScript Date's UTC interpretation
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;

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
  };

  if (loading) {
    return (
      <div className={`${isEmbed ? 'h-full' : 'min-h-screen'} bg-gradient-to-b from-rose-50 to-white flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className={`${isEmbed ? 'h-full' : 'min-h-screen'} bg-gradient-to-b from-rose-50 to-white flex items-center justify-center p-4`}>
        <div className="text-center max-w-md">
          <h1 className="text-xl font-serif text-gray-800 mb-2">Wedding Not Found</h1>
          <p className="text-gray-600 text-sm">
            {error || "We couldn't find a wedding with that access code."}
          </p>
          {!isEmbed && (
            <a
              href="/"
              className="inline-block mt-4 px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
            >
              Go Home
            </a>
          )}
        </div>
      </div>
    );
  }

  // Embed mode: show only the chat widget
  if (isEmbed) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Minimal header with couple names */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-white">
          <h1 className="text-sm font-medium text-gray-700 text-center">
            {wedding.partner1_name} & {wedding.partner2_name}
          </h1>
        </div>

        {/* Chat widget fills remaining space */}
        <div className="flex-1 overflow-hidden">
          <ChatWidget accessCode={accessCode} weddingPreview={wedding} embedded />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-rose-50">
      {/* Top navigation bar */}
      <nav className="relative py-3 px-4 border-b border-rose-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center space-x-2 text-gray-700 hover:text-rose-600 transition-colors">
            <svg className="w-6 h-6 text-rose-500" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 22C6 14 10 10 16 10C22 10 26 14 26 22H6Z" fill="currentColor" opacity="0.9"/>
              <circle cx="16" cy="8" r="3" fill="currentColor"/>
              <rect x="15" y="8" width="2" height="3" fill="currentColor"/>
              <rect x="4" y="22" width="24" height="3" rx="1" fill="currentColor"/>
            </svg>
            <span className="font-serif text-sm">The Wedding Concierge</span>
          </a>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {wedding.wedding_website_url && (
              <a
                href={wedding.wedding_website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1.5 text-sm text-gray-500 hover:text-rose-600 transition-colors"
              >
                <span>Wedding Website</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {user && (
              <a
                href="/dashboard"
                className="flex items-center space-x-1.5 text-sm text-gray-500 hover:text-rose-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>My Dashboard</span>
              </a>
            )}
          </div>

          {/* Mobile hamburger button - only show if there are links to display */}
          {(wedding.wedding_website_url || user) && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-rose-600 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full right-4 mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[180px] md:hidden z-50 border border-gray-100">
            {wedding.wedding_website_url && (
              <a
                href={wedding.wedding_website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2.5 text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Wedding Website
              </a>
            )}
            {user && (
              <a
                href="/dashboard"
                className="flex items-center px-4 py-2.5 text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                My Dashboard
              </a>
            )}
          </div>
        )}
      </nav>

      {/* Header with wedding info */}
      <header className="py-8 px-4 text-center border-b border-rose-100">
        <p className="text-rose-600 text-sm font-medium tracking-wide uppercase mb-2">
          You're Invited
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-gray-800 mb-3">
          {wedding.partner1_name} & {wedding.partner2_name}
        </h1>

        {wedding.wedding_date && (
          <p className="text-gray-600 text-lg mb-2">
            {formatDate(wedding.wedding_date)}
          </p>
        )}

        {wedding.ceremony_venue_name && (
          <p className="text-gray-500">
            {wedding.ceremony_venue_name}
            {wedding.ceremony_venue_address && (
              <span className="block text-sm mt-1">{wedding.ceremony_venue_address}</span>
            )}
          </p>
        )}
      </header>

      {/* Chat section */}
      <main className="py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-medium text-gray-700 mb-2">
              Have Questions?
            </h2>
            <p className="text-gray-500">
              Ask our wedding assistant anything about the big day!
            </p>
          </div>

          <ChatWidget accessCode={accessCode} weddingPreview={wedding} />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm border-t border-rose-100">
        <a href="/" className="text-gray-400 hover:text-rose-500 transition-colors">
          Powered by The Wedding Concierge
        </a>
      </footer>
    </div>
  );
}
