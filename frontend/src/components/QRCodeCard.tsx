'use client';

import { useState, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

interface QRCodeCardProps {
  /** The URL to encode in the QR code */
  url: string;
  /** Title shown above the QR code */
  title: string;
  /** Description shown below the title */
  description?: string;
  /** Size of the QR code in pixels */
  size?: number;
  /** Whether to show download buttons */
  showDownload?: boolean;
  /** Filename prefix for downloads */
  downloadName?: string;
}

export default function QRCodeCard({
  url,
  title,
  description,
  size = 200,
  showDownload = true,
  downloadName = 'qr-code',
}: QRCodeCardProps) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPNG = () => {
    // Get the canvas element from the hidden QRCodeCanvas
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;

    // Create a larger canvas for better quality
    const scale = 4;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = size * scale;
    exportCanvas.height = size * scale;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw the QR code scaled up
    ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    // Download
    const link = document.createElement('a');
    link.download = `${downloadName}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const downloadSVG = () => {
    const svgElement = document.getElementById('qr-svg');
    if (!svgElement) return;

    // Clone the SVG and add white background
    const clone = svgElement.cloneNode(true) as SVGElement;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', 'white');
    clone.insertBefore(rect, clone.firstChild);

    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = `${downloadName}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-medium text-gray-800 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}

      {/* QR Code Display */}
      <div className="flex justify-center mb-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <QRCodeSVG
            id="qr-svg"
            value={url}
            size={size}
            level="H"
            marginSize={2}
          />
        </div>
      </div>

      {/* Hidden canvas for PNG export */}
      <div ref={canvasRef} className="hidden">
        <QRCodeCanvas
          value={url}
          size={size}
          level="H"
          marginSize={2}
        />
      </div>

      {/* URL Display */}
      <div className="mb-4">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
          <input
            type="text"
            value={url}
            readOnly
            className="flex-1 bg-transparent text-sm text-gray-600 truncate border-none focus:outline-none"
          />
          <button
            onClick={copyLink}
            className="text-rose-600 hover:text-rose-700 text-sm font-medium whitespace-nowrap"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Download Buttons */}
      {showDownload && (
        <div className="flex gap-2">
          <button
            onClick={downloadPNG}
            className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            PNG
          </button>
          <button
            onClick={downloadSVG}
            className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            SVG
          </button>
        </div>
      )}
    </div>
  );
}
