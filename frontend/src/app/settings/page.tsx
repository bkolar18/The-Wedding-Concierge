'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getPaymentStatus, PaymentStatus, getMyWedding, updateMyWedding, WeddingData } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [wedding, setWedding] = useState<WeddingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);

  // Chat customization state
  const [chatGreeting, setChatGreeting] = useState('');
  const [showBranding, setShowBranding] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Detect if running as PWA (standalone mode)
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Load payment status and wedding data
  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        const [paymentData, weddingData] = await Promise.all([
          getPaymentStatus(token),
          getMyWedding(token).catch(() => null)
        ]);
        setPaymentStatus(paymentData);
        if (weddingData) {
          setWedding(weddingData);
          setChatGreeting(weddingData.chat_greeting || '');
          setShowBranding(weddingData.show_branding !== false);
        }
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false);
      }
    }
    if (token) {
      loadData();
    }
  }, [token]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSaveChatSettings = async () => {
    if (!token) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        chat_greeting: chatGreeting || null,
      };

      // Only include show_branding if user has paid plan
      if (paymentStatus?.subscription_tier !== 'free') {
        updateData.show_branding = showBranding;
      }

      await updateMyWedding(token, updateData);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
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

      <main className="max-w-2xl mx-auto px-4 py-8 flex-grow w-full">
        <h1 className="text-2xl font-serif text-gray-800 mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Install App Section - Hidden when already running as PWA */}
          {!isStandalone && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-medium text-gray-800 flex items-center mb-4">
              <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Install App on Your Phone
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              Add The Wedding Concierge to your home screen for quick access - no app store needed!
            </p>

            {/* iOS Instructions */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                iPhone / iPad (Safari)
              </h4>
              <ol className="space-y-2 text-sm text-gray-600 ml-7">
                <li className="flex items-start gap-2">
                  <span className="bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                  <span>Tap the <strong>Share</strong> button (square with arrow) at the bottom of Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                  <span>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                  <span>Tap <strong>&quot;Add&quot;</strong> in the top right</span>
                </li>
              </ol>
            </div>

            {/* Android Instructions */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67a.643.643 0 00-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 001 18h22a10.78 10.78 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
                </svg>
                Android (Chrome)
              </h4>
              <ol className="space-y-2 text-sm text-gray-600 ml-7">
                <li className="flex items-start gap-2">
                  <span className="bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                  <span>Tap the <strong>menu button</strong> (three dots) in the top right of Chrome</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                  <span>Tap <strong>&quot;Add to Home Screen&quot;</strong> or <strong>&quot;Install App&quot;</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                  <span>Tap <strong>&quot;Add&quot;</strong> or <strong>&quot;Install&quot;</strong></span>
                </li>
              </ol>
            </div>
          </div>
          )}

          {/* Account Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-medium text-gray-800 flex items-center mb-4">
              <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Account
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Email</span>
                <span className="text-gray-800">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Plan</span>
                <span className={`px-2 py-0.5 rounded-full text-sm ${
                  paymentStatus?.subscription_tier === 'premium'
                    ? 'bg-purple-100 text-purple-700'
                    : paymentStatus?.subscription_tier === 'standard'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {paymentStatus?.subscription_tier === 'premium' ? 'Premium' :
                   paymentStatus?.subscription_tier === 'standard' ? 'Standard' : 'Free'}
                </span>
              </div>
              {paymentStatus?.subscription_tier === 'free' && (
                <Link
                  href="/pricing"
                  className="block text-center mt-4 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors"
                >
                  Upgrade Plan
                </Link>
              )}
            </div>
          </div>

          {/* Chat Customization Section - only show if user has a wedding */}
          {wedding && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-medium text-gray-800 flex items-center mb-4">
              <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat Customization
            </h3>

            {/* Custom Greeting */}
            <div className="mb-4">
              <label htmlFor="chatGreeting" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Welcome Message
              </label>
              <textarea
                id="chatGreeting"
                value={chatGreeting}
                onChange={(e) => setChatGreeting(e.target.value)}
                placeholder={`Hi there! I'm here to help you with any questions about ${wedding.partner1_name} and ${wedding.partner2_name}'s upcoming wedding...`}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {chatGreeting.length}/500 characters. Leave empty to use the default greeting.
              </p>
            </div>

            {/* Show Branding Toggle */}
            <div className="flex items-center justify-between py-3 border-t border-gray-100">
              <div>
                <span className="text-gray-700 font-medium">Show &quot;Powered by&quot; branding</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {paymentStatus?.subscription_tier === 'free'
                    ? 'Upgrade to remove branding'
                    : 'Display branding on chat and registration pages'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBranding(!showBranding)}
                disabled={paymentStatus?.subscription_tier === 'free'}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 ${
                  showBranding ? 'bg-rose-600' : 'bg-gray-200'
                } ${paymentStatus?.subscription_tier === 'free' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showBranding ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Save Button */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              {saveMessage && (
                <p className={`text-sm mb-3 ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                  {saveMessage}
                </p>
              )}
              <button
                onClick={handleSaveChatSettings}
                disabled={isSaving}
                className="w-full py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Chat Settings'}
              </button>
            </div>
          </div>
          )}

          {/* Sign Out */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <button
              onClick={handleLogout}
              className="w-full py-3 text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
