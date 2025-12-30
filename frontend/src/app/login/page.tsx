'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { login as apiLogin } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiLogin(email, password);
      await login(response.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
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
            <h1 className="text-3xl font-serif text-gray-800 mb-2">Welcome back</h1>
            <p className="text-gray-600">Sign in to manage your wedding concierge</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-rose-600 hover:text-rose-700 font-medium">
              Create one
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:flex-1 relative">
        <Image
          src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80"
          alt="Wedding celebration"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-rose-600/40"></div>
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="text-2xl font-serif mb-4">
            Welcome back to The Wedding Concierge
          </h2>
          <p className="text-rose-100">Your concierge is ready to help your guests.</p>
        </div>
      </div>
    </div>
  );
}
