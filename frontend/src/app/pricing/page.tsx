'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { getPaymentConfig, createCheckoutSession, PaymentConfig } from '@/lib/api';

// Hook for scroll-triggered animations
function useScrollAnimation() {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// Feature check icon
function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// Feature X icon
function XIcon() {
  return (
    <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();

  const pricingSection = useScrollAnimation();
  const faqSection = useScrollAnimation();

  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  // Check for payment status in URL
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      setShowSuccess(true);
      // Clear the URL param
      router.replace('/pricing');
    } else if (payment === 'cancelled') {
      setShowCancelled(true);
      router.replace('/pricing');
    }
  }, [searchParams, router]);

  // Load payment config
  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await getPaymentConfig();
        setConfig(data);
      } catch (err) {
        console.error('Failed to load pricing config:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleCheckout = async (tier: 'standard' | 'premium') => {
    setError(null);

    if (!token) {
      // Redirect to register with return URL
      router.push(`/register?redirect=/pricing&tier=${tier}`);
      return;
    }

    setCheckoutLoading(tier);

    try {
      const session = await createCheckoutSession(token, tier);
      // Redirect to Stripe Checkout
      window.location.href = session.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  // Feature lists for each tier
  const features = {
    free: [
      { text: '50 chat messages/month', included: true },
      { text: 'Website import', included: true },
      { text: 'QR code generation', included: true },
      { text: 'Guest self-registration', included: true },
      { text: 'SMS messaging', included: false },
      { text: 'Vendor management', included: false },
      { text: 'Remove branding', included: false },
    ],
    standard: [
      { text: 'Unlimited chat messages', included: true },
      { text: 'Website import', included: true },
      { text: 'QR code generation', included: true },
      { text: 'Guest self-registration', included: true },
      { text: 'SMS messaging', included: true },
      { text: 'Vendor management', included: true },
      { text: 'Remove branding', included: true },
    ],
    premium: [
      { text: 'Unlimited chat messages', included: true },
      { text: 'Website import', included: true },
      { text: 'QR code generation', included: true },
      { text: 'Guest self-registration', included: true },
      { text: 'SMS messaging', included: true },
      { text: 'Vendor management', included: true },
      { text: 'Remove branding', included: true },
      { text: 'Priority support', included: true },
      { text: 'Custom domain', included: true },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col">
      <Header />

      {/* Success/Cancelled Messages */}
      {showSuccess && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-green-800">
              <span className="font-medium">Payment successful!</span> Your account has been upgraded.
            </p>
            <button onClick={() => setShowSuccess(false)} className="text-green-600 hover:text-green-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showCancelled && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-amber-800">
              Payment was cancelled. No charges were made.
            </p>
            <button onClick={() => setShowCancelled(false)} className="text-amber-600 hover:text-amber-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-serif text-gray-800 mb-4 animate-fade-in-up">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-gray-600 max-w-md mx-auto animate-fade-in-up animate-delay-100">
          Choose the plan that works for your wedding
        </p>
      </section>

      {/* Error Message */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <section
        ref={pricingSection.ref as React.RefObject<HTMLElement>}
        className="pb-20 px-4 flex-grow"
      >
        <div className={`max-w-5xl mx-auto ${pricingSection.isVisible ? 'animate-fade-in-up animate-delay-200' : 'opacity-0'}`}>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Free Tier */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-medium text-gray-800">Free</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">$0</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Perfect for trying it out</p>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    {features.free.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {feature.included ? <CheckIcon /> : <XIcon />}
                        <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className="mt-6 w-full block text-center px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:border-gray-300 hover:bg-gray-50 transition-all"
                  >
                    Get Started Free
                  </Link>
                </div>
              </div>

              {/* Standard Tier - Popular */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-rose-500 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 bg-rose-500 text-white text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
                <div className="p-6 border-b border-gray-100 mt-6">
                  <h3 className="text-lg font-medium text-gray-800">Standard</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">$49</span>
                    <span className="ml-2 text-gray-500">one-time</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Everything you need</p>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    {features.standard.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {feature.included ? <CheckIcon /> : <XIcon />}
                        <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleCheckout('standard')}
                    disabled={checkoutLoading === 'standard'}
                    className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl font-medium hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {checkoutLoading === 'standard' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Get Standard'
                    )}
                  </button>
                </div>
              </div>

              {/* Premium Tier */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-medium text-gray-800">Premium</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">$99</span>
                    <span className="ml-2 text-gray-500">one-time</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">For the ultimate experience</p>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    {features.premium.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {feature.included ? <CheckIcon /> : <XIcon />}
                        <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleCheckout('premium')}
                    disabled={checkoutLoading === 'premium'}
                    className="mt-6 w-full px-6 py-3 border-2 border-rose-500 text-rose-600 rounded-xl font-medium hover:bg-rose-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {checkoutLoading === 'premium' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Get Premium'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Note */}
          <p className="text-center text-gray-500 text-sm mt-8">
            Secure payment powered by Stripe. All prices in USD.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        ref={faqSection.ref as React.RefObject<HTMLElement>}
        className="py-16 px-4 bg-white"
      >
        <div className="max-w-2xl mx-auto">
          <h2 className={`text-2xl font-serif text-gray-800 text-center mb-12 ${faqSection.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className={`border-b border-gray-100 pb-6 ${faqSection.isVisible ? 'animate-fade-in-up animate-delay-100' : 'opacity-0'}`}>
              <h3 className="font-medium text-gray-800 mb-2">Is the free tier really free?</h3>
              <p className="text-gray-600">
                Yes! The free tier includes 50 chat messages per month, website import, and QR codes.
                No credit card required. Upgrade anytime if you need more.
              </p>
            </div>

            <div className={`border-b border-gray-100 pb-6 ${faqSection.isVisible ? 'animate-fade-in-up animate-delay-200' : 'opacity-0'}`}>
              <h3 className="font-medium text-gray-800 mb-2">What if I need to update my wedding details?</h3>
              <p className="text-gray-600">
                No problem! You can re-import your wedding website anytime to update
                the information. Changes are reflected immediately.
              </p>
            </div>

            <div className={`border-b border-gray-100 pb-6 ${faqSection.isVisible ? 'animate-fade-in-up animate-delay-300' : 'opacity-0'}`}>
              <h3 className="font-medium text-gray-800 mb-2">How long does my access last?</h3>
              <p className="text-gray-600">
                Your wedding concierge stays active for 6 months after your wedding date,
                so guests can reference it even after the big day.
              </p>
            </div>

            <div className={`border-b border-gray-100 pb-6 ${faqSection.isVisible ? 'animate-fade-in-up animate-delay-400' : 'opacity-0'}`}>
              <h3 className="font-medium text-gray-800 mb-2">What websites can you import?</h3>
              <p className="text-gray-600">
                We support The Knot, Zola, Joy, WeddingWire, Minted, and most custom
                wedding websites. If yours doesn't work, let us know!
              </p>
            </div>

            <div className={`pb-6 ${faqSection.isVisible ? 'animate-fade-in-up animate-delay-500' : 'opacity-0'}`}>
              <h3 className="font-medium text-gray-800 mb-2">How does SMS messaging work?</h3>
              <p className="text-gray-600">
                Upload your guest list and send text messages directly to all your guests.
                Send welcome messages, RSVP reminders, day-before logistics, or custom announcements.
                SMS is included in Standard and Premium tiers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
