"use client";

import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import type { ReactElement } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

const typeStyles: Record<
  ToastType,
  { bg: string; text: string; icon: ReactElement }
> = {
  success: {
    bg: "bg-[#0f172a]/95 border-[#1d4ed8]/50",
    text: "text-[#bfdbfe]",
    icon: <CheckCircle className="w-4 h-4 text-[#60a5fa]" aria-hidden="true" />,
  },
  error: {
    bg: "bg-[#1f0a0a]/95 border-[#7f1d1d]/60",
    text: "text-[#fecaca]",
    icon: <XCircle className="w-4 h-4 text-[#f87171]" aria-hidden="true" />,
  },
  info: {
    bg: "bg-[#0d1117]/95 border-[#30363d]",
    text: "text-gray-200",
    icon: <Info className="w-4 h-4 text-[#8ab4ff]" aria-hidden="true" />,
  },
  warning: {
    bg: "bg-[#1f1300]/95 border-[#92400e]/60",
    text: "text-[#fcd34d]",
    icon: (
      <AlertTriangle className="w-4 h-4 text-[#fbbf24]" aria-hidden="true" />
    ),
  },
};

export function Toast({
  message,
  type = "info",
  onClose,
}: {
  message: string | null;
  type?: ToastType;
  onClose: () => void;
}) {
  if (!message) return null;

  const { bg, text, icon } = typeStyles[type];

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 rounded-lg border backdrop-blur px-3 py-2 shadow-xl ${bg}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        {icon}
        <div className={`text-xs truncate ${text}`}>{message}</div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded hover:bg-[#21262d]"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
      </button>
    </div>
  );
}
