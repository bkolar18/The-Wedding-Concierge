'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Detect if running as PWA (standalone mode)
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
  }, []);

  return (
    <nav className="py-4 px-6 bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href={isStandalone ? "/dashboard" : "/"} className="flex items-center space-x-2">
          <span className="text-xl font-serif text-gray-800">The Wedding Concierge</span>
          <svg className="w-8 h-8 text-rose-500" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 22C6 14 10 10 16 10C22 10 26 14 26 22H6Z" fill="currentColor" opacity="0.9"/>
            <circle cx="16" cy="8" r="3" fill="currentColor"/>
            <rect x="15" y="8" width="2" height="3" fill="currentColor"/>
            <rect x="4" y="22" width="24" height="3" rx="1" fill="currentColor"/>
          </svg>
        </Link>

        {/* Desktop nav - hide in PWA mode */}
        {!isStandalone && (
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
        )}

        {/* Desktop auth buttons */}
        <div className="hidden md:flex items-center space-x-4">
          {isLoading ? (
            <div className="w-20 h-8 bg-gray-100 rounded animate-pulse"></div>
          ) : user ? (
            <>
              {!isStandalone && (
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-rose-600 hover:text-rose-700 font-medium"
                >
                  Dashboard
                </Link>
              )}
              <Link
                href="/settings"
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Settings
              </Link>
              {!isStandalone && (
                <button
                  onClick={logout}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
                >
                  Sign Out
                </button>
              )}
            </>
          ) : !isStandalone ? (
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
          ) : null}
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:text-gray-800"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-gray-100 pt-4">
          <div className="flex flex-col space-y-3">
            {/* Show full nav only when NOT in PWA mode */}
            {!isStandalone && (
              <>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-600 hover:text-gray-800 transition-colors px-2 py-1"
                >
                  Home
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-600 hover:text-gray-800 transition-colors px-2 py-1"
                >
                  Pricing
                </Link>
                <Link
                  href="/import"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-600 hover:text-gray-800 transition-colors px-2 py-1"
                >
                  Import
                </Link>
              </>
            )}

            <div className={!isStandalone ? "border-t border-gray-100 pt-3 mt-2" : ""}>
              {isLoading ? (
                <div className="w-20 h-8 bg-gray-100 rounded animate-pulse"></div>
              ) : user ? (
                <>
                  {!isStandalone && (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-rose-600 hover:text-rose-700 font-medium px-2 py-1"
                    >
                      Dashboard
                    </Link>
                  )}
                  <Link
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-gray-600 hover:text-gray-800 px-2 py-1 mt-1"
                  >
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </span>
                  </Link>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="block text-gray-500 hover:text-gray-700 text-sm px-2 py-1 mt-2"
                  >
                    Sign Out
                  </button>
                </>
              ) : !isStandalone ? (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-gray-600 hover:text-gray-800 px-2 py-1"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block mt-2 text-center px-5 py-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-full hover:from-rose-600 hover:to-rose-700 transition-all shadow-md"
                  >
                    Get Started
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
