import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <span className="text-xl font-serif text-white">The Wedding Concierge</span>
              <svg className="w-8 h-8 text-rose-400" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 22C6 14 10 10 16 10C22 10 26 14 26 22H6Z" fill="currentColor" opacity="0.9"/>
                <circle cx="16" cy="8" r="3" fill="currentColor"/>
                <rect x="15" y="8" width="2" height="3" fill="currentColor"/>
                <rect x="4" y="22" width="24" height="3" rx="1" fill="currentColor"/>
              </svg>
            </Link>
            <p className="text-sm max-w-xs">
              Your personal wedding assistant. Stop answering the same questions - let us handle it.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/import" className="hover:text-white transition-colors">Import Website</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Create Account</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-sm">
          <p>2024 The Wedding Concierge. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
