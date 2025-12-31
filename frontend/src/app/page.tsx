'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatWidget from '@/components/chat/ChatWidget';

export default function Home() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Hero Section with Background Image */}
      <header className="relative py-24 px-4 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80"
            alt="Wedding background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/90 to-white/70"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-4 py-1 bg-rose-100 text-rose-600 rounded-full text-sm font-medium mb-6 animate-fade-in">
              Your Personal Wedding Assistant
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-gray-800 mb-6 leading-tight animate-fade-in-up">
              Stop answering the same questions
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg animate-fade-in-up animate-delay-100">
              Your guests have questions about hotels, dress code, and directions.
              Let your concierge handle them 24/7 so you can focus on your big day.
            </p>
            {!user && !isLoading && (
              <div className="flex flex-col sm:flex-row items-start gap-4 animate-fade-in-up animate-delay-200">
                <Link
                  href="/register"
                  className="px-8 py-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-full font-medium hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  Get Started - $49
                </Link>
                <Link
                  href="/pricing"
                  className="px-8 py-4 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  View Pricing
                </Link>
              </div>
            )}
            {user && (
              <Link
                href="/dashboard"
                className="inline-block px-8 py-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-full font-medium hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 animate-fade-in-up animate-delay-200"
              >
                Go to Dashboard
              </Link>
            )}
          </div>

          {/* Hero Image */}
          <div className="hidden lg:block relative animate-slide-in-right animate-delay-200">
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80"
                alt="Happy wedding couple"
                fill
                className="object-cover"
              />
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg max-w-xs animate-scale-in animate-delay-500">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Question answered!</p>
                  <p className="text-xs text-gray-500">"What hotel has the room block?"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Value Props */}
      <section className="py-8 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-8 text-gray-600 text-sm">
          <div className="flex items-center space-x-2 animate-fade-in animate-delay-100">
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Works with The Knot, Zola & more</span>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
          <div className="flex items-center space-x-2 animate-fade-in animate-delay-200">
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Answers questions 24/7</span>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
          <div className="flex items-center space-x-2 animate-fade-in animate-delay-300">
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>SMS blasts & reminders</span>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
          <div className="flex items-center space-x-2 animate-fade-in animate-delay-400">
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Set up in minutes</span>
          </div>
        </div>
      </section>

      {/* Features Section with Images */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-gray-800 mb-4 animate-fade-in-up">
              How It Works
            </h2>
            <p className="text-gray-600 max-w-md mx-auto animate-fade-in-up animate-delay-100">
              Get your wedding concierge up and running in minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 animate-fade-in-up animate-delay-200">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6">
                <Image
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80"
                  alt="Import your website"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                  <span className="text-rose-600 font-bold text-sm">1</span>
                </div>
                <h3 className="font-medium text-gray-800">Import Your Website</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Paste your wedding website URL. We'll automatically extract all the details - venues, hotels, schedule, and more.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 animate-fade-in-up animate-delay-300">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6">
                <Image
                  src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80"
                  alt="Share your link"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                  <span className="text-rose-600 font-bold text-sm">2</span>
                </div>
                <h3 className="font-medium text-gray-800">Reach Your Guests</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Share your chat link on invitations, send SMS blasts to all guests, or schedule automated reminders for RSVP deadlines.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 animate-fade-in-up animate-delay-400">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6">
                <Image
                  src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80"
                  alt="Guests get answers"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                  <span className="text-rose-600 font-bold text-sm">3</span>
                </div>
                <h3 className="font-medium text-gray-800">Guests Get Answers</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Guests ask questions and get instant, accurate answers 24/7. No more repetitive texts or emails for you!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-rose-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-in-left">
              <h2 className="text-3xl font-serif text-gray-800 mb-4">
                Try it yourself
              </h2>
              <p className="text-gray-600 mb-6">
                See how your concierge answers real wedding questions.
                This demo uses a sample wedding - yours will have your actual details.
              </p>
              <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500 mb-1">Demo access code:</p>
                <code className="text-rose-600 font-mono font-medium">alice-bob-test</code>
              </div>
            </div>
            <div className="animate-slide-in-right animate-delay-200">
              <ChatWidget />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif text-gray-800 mb-4 animate-fade-in-up">
              Why Wedding Concierge?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 animate-fade-in-up animate-delay-100">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Save Hours of Time</h3>
              <p className="text-gray-600 text-sm">
                Stop answering the same questions about hotels and dress code. Let your concierge handle it.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 animate-fade-in-up animate-delay-200">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Available 24/7</h3>
              <p className="text-gray-600 text-sm">
                Guests get answers at midnight without texting you. The chat works around the clock.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 animate-fade-in-up animate-delay-300">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">SMS Blasts</h3>
              <p className="text-gray-600 text-sm">
                Send text messages to all your guests at once. Announce updates, share your chat link, or send thank you notes.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 animate-fade-in-up animate-delay-400">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Scheduled Reminders</h3>
              <p className="text-gray-600 text-sm">
                Automate RSVP deadline reminders and day-before logistics texts. Set it and forget it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && !isLoading && (
        <section className="py-20 px-4 bg-gradient-to-r from-rose-500 to-rose-600">
          <div className="max-w-2xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-serif mb-4 animate-fade-in-up">
              Ready to simplify your wedding?
            </h2>
            <p className="text-rose-100 mb-8 text-lg animate-fade-in-up animate-delay-100">
              Stop answering the same questions over and over. Let your concierge handle it for just $49.
            </p>
            <Link
              href="/register"
              className="inline-block px-8 py-4 bg-white text-rose-600 rounded-full font-medium hover:bg-rose-50 hover:-translate-y-1 transition-all shadow-lg animate-fade-in-up animate-delay-200"
            >
              Get Started Now
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
