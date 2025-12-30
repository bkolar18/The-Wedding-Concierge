'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getWeddingPreview, WeddingPreview } from '@/lib/api';
import ChatWidget from '@/components/chat/ChatWidget';

export default function WeddingChatPage() {
  const params = useParams();
  const accessCode = params.accessCode as string;

  const [wedding, setWedding] = useState<WeddingPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Format wedding date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wedding details...</p>
        </div>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">💒</div>
          <h1 className="text-2xl font-serif text-gray-800 mb-2">Wedding Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || "We couldn't find a wedding with that access code. Please check the link and try again."}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-rose-50">
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
      <footer className="py-6 text-center text-gray-400 text-sm border-t border-rose-100">
        <p>Powered by The Wedding Concierge</p>
      </footer>
    </div>
  );
}
