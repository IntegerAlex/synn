'use client';

import { X } from 'lucide-react';

export function Toast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  if (!message) return null;

  return (
    <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-lg border border-[#30363d] bg-[#0d1117]/95 backdrop-blur px-3 py-2 shadow-xl">
      <div className="text-xs text-gray-200 truncate">{message}</div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded hover:bg-[#21262d]"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}

