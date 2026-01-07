'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPublicWeddingBySlug } from '@/lib/api';

/**
 * Guest registration page - now redirects to the unified chat page.
 * The chat page handles registration inline before starting the conversation.
 */
export default function GuestRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function redirectToChat() {
      try {
        // Look up the wedding to get the access code
        const wedding = await getPublicWeddingBySlug(slug);
        // Redirect to the chat page with the access code
        router.replace(`/chat/${wedding.access_code}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Wedding not found');
      }
    }

    if (slug) {
      redirectToChat();
    }
  }, [slug, router]);

  // Show error if wedding not found
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif text-gray-800 mb-3">Wedding Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center text-rose-600 hover:text-rose-700 font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  // Loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to chat...</p>
      </div>
    </div>
  );
}
