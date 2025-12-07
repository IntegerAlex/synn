'use client';

export function Footer() {
  return (
    <footer className="h-10 bg-[#161b22] border-t border-[#30363d] flex items-center justify-center px-4">
      <p className="text-xs text-gray-400">
        © {new Date().getFullYear()} Synn. All rights reserved.
      </p>
    </footer>
  );
}

