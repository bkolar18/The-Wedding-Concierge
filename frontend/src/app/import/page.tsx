'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { scrapeWeddingWebsite, importWeddingFromUrl, ScrapePreview, ScrapeEvent, ScrapeAccommodation, ScrapeFAQ, ImportResponse } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type Step = 'input' | 'scanning' | 'preview' | 'success';

const SCAN_STAGES = [
  { progress: 10, message: 'Connecting to website...' },
  { progress: 25, message: 'Loading main page...' },
  { progress: 40, message: 'Finding additional pages...' },
  { progress: 55, message: 'Scanning travel & accommodations...' },
  { progress: 70, message: 'Scanning events & schedule...' },
  { progress: 85, message: 'Extracting wedding details...' },
  { progress: 95, message: 'Almost done...' },
];

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

  // User is logged in if we have a token from AuthContext
  const isLoggedIn = !!token;

  // Progress animation during scanning
  useEffect(() => {
    if (step !== 'scanning') {
      setScanProgress(0);
      setScanMessage('');
      setShowLongWaitMessage(false);
      return;
    }

    let stageIndex = 0;
    const interval = setInterval(() => {
      if (stageIndex < SCAN_STAGES.length) {
        setScanProgress(SCAN_STAGES[stageIndex].progress);
        setScanMessage(SCAN_STAGES[stageIndex].message);
        stageIndex++;
      }
    }, 8000); // Move to next stage every 8 seconds

    // Start immediately
    setScanProgress(SCAN_STAGES[0].progress);
    setScanMessage(SCAN_STAGES[0].message);

    // Show long wait message after 50 seconds
    const longWaitTimeout = setTimeout(() => {
      setShowLongWaitMessage(true);
    }, 50000);

    return () => {
      clearInterval(interval);
      clearTimeout(longWaitTimeout);
    };
  }, [step]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setStep('scanning');

    try {
      const result = await scrapeWeddingWebsite(url);
      setScanProgress(100);
      setScanMessage('Complete!');
      // Small delay to show 100% before transitioning
      await new Promise(resolve => setTimeout(resolve, 500));
      setPreview(result.preview);
      setScrapedData(result.data);  // Store scraped data to avoid re-scraping on import
      setPlatform(result.platform);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan website');
      setStep('input');
    } finally {
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

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Don&apos;t have a wedding website?{' '}
                  <Link href="/register" className="text-rose-600 hover:text-rose-700">
                    Create your wedding manually
                  </Link>
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
                  <span className="px-3 py-1 bg-rose-100 text-rose-700 text-sm rounded-full capitalize">
                    {platform}
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
                      Wedding Date: {new Date(preview.wedding_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
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
                            {event.date && <p>{event.date}{event.time ? ` at ${event.time}` : ''}</p>}
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
                <p className="mt-8 text-sm text-gray-500">
                  Your wedding has been linked to your account.{' '}
                  <Link href="/dashboard" className="text-rose-600 hover:text-rose-700">
                    Go to Dashboard
                  </Link>{' '}
                  to edit details and manage your concierge.
                </p>
              ) : (
                <p className="mt-8 text-sm text-gray-500">
                  Want to edit your wedding details?{' '}
                  <Link href="/register" className="text-rose-600 hover:text-rose-700">
                    Create an account
                  </Link>{' '}
                  to access the dashboard.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
