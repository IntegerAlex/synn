"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="min-h-12 bg-bg-card border-t border-border-main px-4 py-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
        <p className="text-xs text-text-sub">
          © {new Date().getFullYear()} Synn. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-xs text-text-sub">
          <Link
            href="/privacy"
            className="hover:text-text-main transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hover:text-text-main transition-colors"
          >
            Terms
          </Link>
          <span className="text-border-main">·</span>
          <a
            href="https://gossorg.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-text-sub hover:text-accent-main transition-colors"
          >
            GOSSORG
          </a>
          <span className="text-border-main">·</span>
          <a
            href="https://www.akshatkotpalliwar.in/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="by Akshat Kotpalliwar"
            className="font-medium text-text-sub hover:text-accent-main transition-colors"
          >
            by Akshat Kotpalliwar
          </a>
        </div>
      </div>
    </footer>
  );
}
