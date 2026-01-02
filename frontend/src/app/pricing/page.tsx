'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col">
      <Header />

      {/* Hero */}
      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-serif text-gray-800 mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          One price. Unlimited questions. No surprises.
        </p>
      </section>

      {/* Pricing Card */}
      <section className="pb-20 px-4 flex-grow">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-8 text-center text-white">
              <p className="text-rose-100 uppercase tracking-wide text-sm font-medium mb-2">
                The Wedding Concierge
              </p>
              <div className="flex items-baseline justify-center">
                <span className="text-5xl font-bold">$49</span>
                <span className="text-rose-200 ml-2">one-time</span>
              </div>
              <p className="text-rose-100 mt-2">Per wedding</p>
            </div>

            {/* Features */}
            <div className="p-8">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">
                    <strong>Unlimited messages</strong> - No caps, no limits
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">
                    <strong>Unlimited guests</strong> - Share with everyone
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">
                    <strong>Website import</strong> - We scrape your wedding site automatically
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">
                    <strong>Instant answers</strong> - Hotels, events, dress code, activities & more
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">
                    <strong>Shareable link</strong> - Easy to add to invites or texts
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">
                    <strong>24/7 availability</strong> - Answers questions day or night
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">
                    <strong>SMS guest messaging</strong> - Send blasts & schedule reminders
                  </span>
                </li>
              </ul>

              <Link
                href="/register"
                className="mt-8 w-full block text-center px-8 py-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl font-medium hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>

              <p className="text-center text-gray-500 text-sm mt-4">
                No credit card required to try
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-serif text-gray-800 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="border-b border-gray-100 pb-6">
              <h3 className="font-medium text-gray-800 mb-2">When am I charged?</h3>
              <p className="text-gray-600">
                You only pay when you're ready to share your chat link with guests.
                You can import your wedding website and preview everything for free.
              </p>
            </div>

            <div className="border-b border-gray-100 pb-6">
              <h3 className="font-medium text-gray-800 mb-2">What if I need to update my wedding details?</h3>
              <p className="text-gray-600">
                No problem! You can re-import your wedding website anytime to update
                the information. Changes are reflected immediately.
              </p>
            </div>

            <div className="border-b border-gray-100 pb-6">
              <h3 className="font-medium text-gray-800 mb-2">How long does my access last?</h3>
              <p className="text-gray-600">
                Your wedding concierge stays active for 6 months after your wedding date,
                so guests can reference it even after the big day.
              </p>
            </div>

            <div className="border-b border-gray-100 pb-6">
              <h3 className="font-medium text-gray-800 mb-2">What websites can you import?</h3>
              <p className="text-gray-600">
                We support The Knot, Zola, Joy, WeddingWire, Minted, and most custom
                wedding websites. If yours doesn't work, let us know!
              </p>
            </div>

            <div className="pb-6">
              <h3 className="font-medium text-gray-800 mb-2">How does SMS messaging work?</h3>
              <p className="text-gray-600">
                Upload your guest list and send text messages directly to all your guests.
                Send welcome messages, RSVP reminders, day-before logistics, or custom announcements.
                You can also schedule messages in advance (like "7 days before wedding").
                SMS costs approximately $0.01 per text and is billed separately based on usage.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
