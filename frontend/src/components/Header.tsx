'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, isLoading, logout } = useAuth();

  return (
    <nav className="py-4 px-6 bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-serif text-gray-800">The Wedding Concierge</span>
          <svg className="w-8 h-8 text-rose-500" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Bell dome */}
            <path d="M6 22C6 14 10 10 16 10C22 10 26 14 26 22H6Z" fill="currentColor" opacity="0.9"/>
            {/* Button on top */}
            <circle cx="16" cy="8" r="3" fill="currentColor"/>
            {/* Button stem */}
            <rect x="15" y="8" width="2" height="3" fill="currentColor"/>
            {/* Base */}
            <rect x="4" y="22" width="24" height="3" rx="1" fill="currentColor"/>
          </svg>
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-gray-600 hover:text-gray-800 transition-colors">
            Home
          </Link>
          <Link href="/pricing" className="text-gray-600 hover:text-gray-800 transition-colors">
            Pricing
          </Link>
          <Link href="/import" className="text-gray-600 hover:text-gray-800 transition-colors">
            Import
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="w-20 h-8 bg-gray-100 rounded animate-pulse"></div>
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-rose-600 hover:text-rose-700 font-medium"
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-full hover:from-rose-600 hover:to-rose-700 transition-all shadow-md hover:shadow-lg"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
