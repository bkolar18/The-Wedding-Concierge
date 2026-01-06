'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startScrapeJob, getScrapeJobStatus, importWeddingFromUrl, ScrapePreview, ScrapeEvent, ScrapeAccommodation, ScrapeFAQ, ImportResponse } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type Step = 'input' | 'scanning' | 'preview' | 'success';

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

// Format date as MM/DD/YYYY for event dates
function formatEventDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = match[1];
    const month = match[2];
    const day = match[3];
    return `${month}/${day}/${year}`;
  }
  return dateStr;
}

// Format platform name for display
function formatPlatformName(platform: string): string {
  const platformNames: Record<string, string> = {
    'the_knot': 'The Knot',
    'zola': 'Zola',
    'joy': 'WithJoy',
    'weddingwire': 'WeddingWire',
    'minted': 'Minted',
    'generic': 'Website',
  };
  return platformNames[platform] || platform;
}

export default function ImportPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [step, setStep] = useState<Step>('input');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ScrapePreview | null>(null);
  const [scrapedData, setScrapedData] = useState<Record<string, unknown> | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  // User is logged in if we have a token from AuthContext
  const isLoggedIn = !!token;

  // Poll for job status when we have a jobId and are scanning
  useEffect(() => {
    if (!jobId || step !== 'scanning') {
      return;
    }

    let cancelled = false;
    let pollCount = 0;

    const pollJobStatus = async () => {
      try {
        const status = await getScrapeJobStatus(jobId);

        if (cancelled) return;

        // Update progress from server
        setScanProgress(status.progress);
        setScanMessage(status.message || 'Processing...');

        if (status.status === 'completed' && status.preview && status.data) {
          // Success!
          setScanProgress(100);
          setScanMessage('Complete!');
          await new Promise(resolve => setTimeout(resolve, 500));
          setPreview(status.preview);
          setScrapedData(status.data);
          setPlatform(status.platform || null);
          setStep('preview');
          setIsLoading(false);
          setJobId(null);
        } else if (status.status === 'failed') {
          // Error
          setError(status.error || 'Failed to scan website');
          setStep('input');
          setIsLoading(false);
          setJobId(null);
        } else {
          // Still processing, poll again
          pollCount++;
          // Show long wait message after ~50 seconds (about 17 polls at 3s each)
          if (pollCount > 17) {
            setShowLongWaitMessage(true);
          }
          setTimeout(pollJobStatus, 3000);
        }
      } catch (err) {
        if (cancelled) return;
        // Network error - retry a few times
        if (pollCount < 60) {
          pollCount++;
          setTimeout(pollJobStatus, 3000);
        } else {
          setError('Lost connection to server. Your scan may still be processing - try refreshing.');
          setStep('input');
          setIsLoading(false);
          setJobId(null);
        }
      }
    };

    // Start polling
    pollJobStatus();

    return () => {
      cancelled = true;
    };
  }, [jobId, step]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setStep('scanning');
    setScanProgress(5);
    setScanMessage('Starting...');
    setShowLongWaitMessage(false);

    try {
      // Start background job - returns immediately
      const { job_id } = await startScrapeJob(url);
      setJobId(job_id);
      // Polling will be handled by the useEffect above
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
      setStep('input');
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Pass scraped data to avoid re-scraping, and token if logged in
      const result = await importWeddingFromUrl(url, token || undefined, scrapedData || undefined);
      setImportResult(result);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import wedding');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setUrl('');
    setPreview(null);
    setScrapedData(null);
    setPlatform(null);
    setImportResult(null);
    setError(null);
    setJobId(null);
    setScanProgress(0);
    setScanMessage('');
    setShowLongWaitMessage(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col">
      <Header />

      <main className="py-12 px-4 flex-grow">
        <div className="max-w-2xl mx-auto">
          {/* Step 1: URL Input */}
          {(step === 'input' || step === 'scanning') && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h1 className="text-2xl font-serif text-gray-800 mb-2 text-center">
                Import Your Wedding Website
              </h1>
              <p className="text-gray-600 text-center mb-8">
                Paste your wedding website URL and we&apos;ll automatically extract all the details.
              </p>

              <form onSubmit={handleScan} className="space-y-6">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                    Wedding Website URL
                  </label>
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.theknot.com/us/jane-and-john"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                    disabled={step === 'scanning'}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Supports The Knot, Zola, WithJoy, WeddingWire, Minted, and more
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                  </div>
                )}

                {/* Progress Bar - shown during scanning */}
                {step === 'scanning' && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{scanMessage}</span>
                      <span className="text-rose-600 font-medium">{scanProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-rose-500 to-rose-600 h-3 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      This may take up to 3 minutes while we scan all pages...
                    </p>
                    {showLongWaitMessage && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 text-center">
                          <span className="font-medium">Taking a bit longer?</span> Some wedding sites like The Knot and WeddingWire require more time to navigate. Hang tight — we&apos;re working on it!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !url || step === 'scanning'}
                  className="w-full py-3 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {step === 'scanning' ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Scanning Website...
                    </span>
                  ) : (
                    'Scan Website'
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Don&apos;t have a wedding website? No problem!
                  </p>
                  <Link
                    href="/setup"
                    className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Set Up with Guided Wizard
                  </Link>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Our step-by-step wizard will help you enter all your wedding details
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && preview && (
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 overflow-hidden">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <h1 className="text-2xl font-serif text-gray-800">
                  Preview Extracted Data
                </h1>
                {platform && (
                  <span className="px-3 py-1 bg-rose-100 text-rose-700 text-sm rounded-full">
                    {formatPlatformName(platform)}
                  </span>
                )}
              </div>

              <div className="space-y-6">
                {/* Partner Names & Date */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h2 className="text-lg font-medium text-gray-800 mb-2">
                    {preview.partner1_name} & {preview.partner2_name}
                  </h2>
                  {preview.wedding_date && (
                    <p className="text-gray-600">
                      Wedding Date: {formatDateString(preview.wedding_date)}
                    </p>
                  )}
                </div>

                {/* Venues with Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Ceremony Venue</h3>
                    <p className="text-gray-800 font-medium">{preview.ceremony_venue || 'Not specified'}</p>
                    {preview.ceremony_venue_address && (
                      <p className="text-gray-600 text-sm mt-1">{preview.ceremony_venue_address}</p>
                    )}
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Reception Venue</h3>
                    <p className="text-gray-800 font-medium">{preview.reception_venue || 'Same as ceremony'}</p>
                    {preview.reception_venue_address && (
                      <p className="text-gray-600 text-sm mt-1">{preview.reception_venue_address}</p>
                    )}
                  </div>
                </div>

                {preview.dress_code && (
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Dress Code</h3>
                    <p className="text-gray-800">{preview.dress_code}</p>
                  </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xl font-bold text-rose-600">{preview.events_count}</p>
                    <p className="text-xs text-gray-500">Events</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xl font-bold text-rose-600">{preview.accommodations_count}</p>
                    <p className="text-xs text-gray-500">Hotels</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xl font-bold text-rose-600">{preview.faqs_count || 0}</p>
                    <p className="text-xs text-gray-500">FAQs</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xl font-bold text-rose-600">{preview.has_registry ? 'Yes' : 'No'}</p>
                    <p className="text-xs text-gray-500">Registry</p>
                  </div>
                </div>

                {/* Retry/Manual Entry Notice */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 text-center">
                    Something missing or doesn&apos;t look right? Try scanning again, or continue and add missing details from your dashboard.
                  </p>
                </div>

                {/* Events List */}
                {preview.events && preview.events.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="font-medium text-gray-800">Events ({preview.events.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {preview.events.map((event: ScrapeEvent, idx: number) => (
                        <div key={idx} className="p-4">
                          <p className="font-medium text-gray-800">{event.name}</p>
                          <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                            {event.date && <p>{formatEventDate(event.date)}{event.time ? ` at ${event.time}` : ''}</p>}
                            {event.venue_name && <p>{event.venue_name}</p>}
                            {event.venue_address && <p className="text-gray-500">{event.venue_address}</p>}
                            {event.dress_code && <p className="text-gray-500">Dress code: {event.dress_code}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accommodations List */}
                {preview.accommodations && preview.accommodations.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="font-medium text-gray-800">Accommodations ({preview.accommodations.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {preview.accommodations.map((acc: ScrapeAccommodation, idx: number) => (
                        <div key={idx} className="p-4">
                          <p className="font-medium text-gray-800">{acc.name}</p>
                          <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                            {acc.address && <p>{acc.address}</p>}
                            {acc.room_block_name && <p>Room block: {acc.room_block_name}</p>}
                            {acc.room_block_code && <p className="text-gray-500">Code: {acc.room_block_code}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQs List */}
                {preview.faqs && preview.faqs.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="font-medium text-gray-800">FAQs ({preview.faqs.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {preview.faqs.map((faq: ScrapeFAQ, idx: number) => (
                        <div key={idx} className="p-4">
                          <p className="font-medium text-gray-800">{faq.question}</p>
                          <p className="text-sm text-gray-600 mt-1">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleStartOver}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isLoading}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      'Create My Concierge'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && importResult && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>

              <h1 className="text-2xl font-serif text-gray-800 mb-2">
                Your Wedding Concierge is Ready!
              </h1>
              <p className="text-gray-600 mb-8">
                Share your chat link with guests so they can get instant answers.
              </p>

              <div className="p-4 bg-gray-50 rounded-lg mb-6">
                <p className="text-sm text-gray-500 mb-2">Your Chat Link</p>
                <p className="text-lg font-mono text-gray-800 break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/chat/{importResult.access_code}
                </p>
              </div>

              <div className="p-4 bg-rose-50 rounded-lg mb-8">
                <p className="text-sm text-gray-500 mb-2">Access Code</p>
                <p className="text-xl font-mono text-rose-600">{importResult.access_code}</p>
              </div>

              <div className="space-y-4">
                <Link
                  href={`/chat/${importResult.access_code}`}
                  className="block w-full py-3 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors"
                >
                  Try Your Chat Now
                </Link>
                <button
                  onClick={() => {
                    const chatUrl = `${window.location.origin}/chat/${importResult.access_code}`;
                    navigator.clipboard.writeText(chatUrl);
                    alert('Link copied to clipboard!');
                  }}
                  className="block w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Copy Link to Share
                </button>
              </div>

              {isLoggedIn ? (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-4">
                    Your wedding has been linked to your account.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Go to Dashboard
                    </Link>
                    <Link
                      href="/setup?enhance=true"
                      className="inline-flex items-center justify-center px-6 py-3 border border-rose-200 text-rose-600 rounded-xl font-medium hover:bg-rose-50 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Review & Enhance Details
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-4">
                    Want to edit your wedding details?
                  </p>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center px-6 py-3 bg-rose-100 text-rose-700 rounded-xl font-medium hover:bg-rose-200 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Create Account to Access Dashboard
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
