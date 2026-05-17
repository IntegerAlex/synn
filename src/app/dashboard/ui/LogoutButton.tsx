"use client";

import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await fetch("/api/auth/pk/logout", { method: "POST" });
      window.location.href = "/dashboard/forbidden";
    } catch (_error) {
      // Silently ignore for now
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full border border-[#1f2a38] bg-[#0f131a]/80 px-3 py-2 text-xs text-gray-200 hover:bg-[#161c24] shadow-lg shadow-black/20 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      Logout
    </button>
  );
}
