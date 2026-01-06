'use client';

import { useState, useEffect } from 'react';

interface PWAInstallPromptProps {
  userId: string;
}

export default function PWAInstallPrompt({ userId }: PWAInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return; // Don't show if already installed

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Only show on mobile devices
    if (!isIOSDevice && !isAndroidDevice) return;

    // Check if user has dismissed this prompt before (stored per user)
    const dismissedKey = `pwa_prompt_dismissed_${userId}`;
    const dismissed = localStorage.getItem(dismissedKey);

    if (dismissed) return;

    // Show prompt after a short delay for better UX
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [userId]);

  const handleDismiss = () => {
    const dismissedKey = `pwa_prompt_dismissed_${userId}`;
    localStorage.setItem(dismissedKey, 'true');
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-fade-in"
      onClick={handleDismiss}
    >
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg p-6 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-serif text-center text-gray-800 mb-2">
          Add to Home Screen
        </h3>

        <p className="text-gray-600 text-center text-sm mb-6">
          Install The Wedding Concierge for quick access to your dashboard
        </p>

        {/* Instructions based on platform */}
        {isIOS && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">1</span>
              </div>
              <div>
                <p className="text-gray-800 font-medium">Tap the Share button</p>
                <p className="text-gray-500 text-sm">The square icon with an arrow at the bottom of Safari</p>
                <div className="mt-2 flex justify-center">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">2</span>
              </div>
              <div>
                <p className="text-gray-800 font-medium">Scroll and tap "Add to Home Screen"</p>
                <p className="text-gray-500 text-sm">You may need to scroll down in the share menu</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">3</span>
              </div>
              <div>
                <p className="text-gray-800 font-medium">Tap "Add"</p>
                <p className="text-gray-500 text-sm">The app will appear on your home screen</p>
              </div>
            </div>
          </div>
        )}

        {isAndroid && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">1</span>
              </div>
              <div>
                <p className="text-gray-800 font-medium">Tap the menu button</p>
                <p className="text-gray-500 text-sm">The three dots in the top-right corner of Chrome</p>
                <div className="mt-2 flex justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">2</span>
              </div>
              <div>
                <p className="text-gray-800 font-medium">Tap "Add to Home Screen" or "Install App"</p>
                <p className="text-gray-500 text-sm">The option may vary by browser</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">3</span>
              </div>
              <div>
                <p className="text-gray-800 font-medium">Tap "Add" or "Install"</p>
                <p className="text-gray-500 text-sm">The app will appear on your home screen</p>
              </div>
            </div>
          </div>
        )}

        {/* Got it button */}
        <button
          onClick={handleDismiss}
          className="w-full mt-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors"
        >
          Got it
        </button>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
