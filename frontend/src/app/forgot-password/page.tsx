'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:flex-1 relative">
        <Image
          src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80"
          alt="Wedding flowers"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-rose-600/40"></div>
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="text-3xl font-serif mb-4">
            Don't worry, we've got you
          </h2>
          <p className="text-rose-100 text-lg">
            We'll send you a link to reset your password and get you back on track.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link href="/" className="flex items-center space-x-2 mb-8">
              <span className="text-xl font-serif text-gray-800">The Wedding Concierge</span>
              <svg className="w-8 h-8 text-rose-500" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 22C6 14 10 10 16 10C22 10 26 14 26 22H6Z" fill="currentColor" opacity="0.9"/>
                <circle cx="16" cy="8" r="3" fill="currentColor"/>
                <rect x="15" y="8" width="2" height="3" fill="currentColor"/>
                <rect x="4" y="22" width="24" height="3" rx="1" fill="currentColor"/>
              </svg>
            </Link>
            <h1 className="text-3xl font-serif text-gray-800 mb-2">Reset your password</h1>
            <p className="text-gray-600">Enter your email and we'll send you a reset link</p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-green-800 mb-2">Check your email</h3>
                <p className="text-green-700 text-sm">
                  If an account exists with that email, you'll receive a password reset link shortly.
                </p>
              </div>

              <p className="text-center text-sm text-gray-500">
                Didn't receive an email?{' '}
                <button
                  onClick={() => setSuccess(false)}
                  className="text-rose-600 hover:text-rose-700 font-medium"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
                  required
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl font-medium hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{' '}
            <Link href="/login" className="text-rose-600 hover:text-rose-700 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
