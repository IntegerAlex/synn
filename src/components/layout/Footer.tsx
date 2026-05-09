'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="min-h-12 bg-[#161b22] border-t border-[#30363d] px-4 py-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
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
          <span className="text-gray-700">·</span>
          <a
            href="https://gossorg.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-400 hover:text-blue-400 transition-colors"
          >
            GOSSORG
          </a>
          <span className="text-gray-700">·</span>
          <a
            href="https://www.akshatkotpalliwar.in/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="by Akshat Kotpalliwar"
            className="font-medium text-gray-400 hover:text-blue-400 transition-colors"
          >
            by Akshat Kotpalliwar
          </a>
        </div>
      </div>
    </footer>
  );
}
