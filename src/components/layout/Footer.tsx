'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="h-12 bg-[#161b22] border-t border-[#30363d] flex items-center justify-center px-4">
      <div className="flex items-center gap-6">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Synn. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-gray-300 transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
