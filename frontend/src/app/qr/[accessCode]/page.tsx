'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

export default function QRCodePage() {
  const params = useParams();
  const accessCode = params.accessCode as string;
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Build the chat URL
  const chatUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/chat/${accessCode}`
    : '';

  const handleDownloadPNG = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    canvas.width = 1024;
    canvas.height = 1024;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 1024, 1024);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `wedding-concierge-qr-${accessCode}.png`;
      link.href = pngUrl;
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleDownloadSVG = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `wedding-concierge-qr-${accessCode}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(chatUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col">
      {/* Header */}
      <header className="py-6 px-8 border-b border-rose-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2 text-gray-800 hover:text-rose-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-serif text-gray-800">The Wedding Concierge</span>
            <svg className="w-8 h-8 text-rose-500" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 22C6 14 10 10 16 10C22 10 26 14 26 22H6Z" fill="currentColor" opacity="0.9"/>
              <circle cx="16" cy="8" r="3" fill="currentColor"/>
              <rect x="15" y="8" width="2" height="3" fill="currentColor"/>
              <rect x="4" y="22" width="24" height="3" rx="1" fill="currentColor"/>
            </svg>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          {/* QR Code Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-2xl font-serif text-gray-800 mb-2">Your Wedding Chat QR Code</h1>
            <p className="text-gray-500 mb-8">
              Guests can scan this code to instantly access your wedding concierge
            </p>

            {/* QR Code */}
            <div
              ref={qrRef}
              className="inline-block p-6 bg-white rounded-xl border-2 border-rose-100 mb-6"
            >
              <QRCodeSVG
                value={chatUrl}
                size={256}
                level="H"
                includeMargin={false}
                fgColor="#1f2937"
              />
            </div>

            {/* Chat URL */}
            <div className="mb-8">
              <p className="text-xs text-gray-400 mb-2">Chat URL</p>
              <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-lg p-3">
                <code className="text-sm text-gray-600 break-all">{chatUrl}</code>
                <button
                  onClick={handleCopyLink}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-rose-600 transition-colors"
                  title="Copy link"
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleDownloadPNG}
                className="inline-flex items-center justify-center px-6 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PNG
              </button>
              <button
                onClick={handleDownloadSVG}
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-700 rounded-xl font-medium border border-gray-200 hover:border-rose-300 hover:text-rose-600 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download SVG
              </button>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p className="mb-2 font-medium text-gray-600">Tips for sharing:</p>
            <ul className="space-y-1">
              <li>Print and display at your welcome table</li>
              <li>Add to your wedding program or invitations</li>
              <li>Share in your wedding website or group chat</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-400">
        <p>Powered by The Wedding Concierge</p>
      </footer>
    </div>
  );
}
