"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { CommandPalette } from "@/components/CommandPalette";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useFingerprint } from "@/lib/hooks/useFingerprint";

function FingerprintTracker() {
  useFingerprint(); // Initialize fingerprint tracking
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <QueryProvider>
        <FingerprintTracker />
        <div className="h-screen w-screen bg-[#0d1117] text-gray-100">
          {children}
        </div>
        <CommandPalette />
        <ToastContainer />
      </QueryProvider>
    </ClerkProvider>
  );
}
