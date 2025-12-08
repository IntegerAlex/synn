'use client';

import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { useFingerprint } from "@/lib/hooks/useFingerprint";

function FingerprintTracker() {
    useFingerprint(); // Initialize fingerprint tracking
    return null;
}

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            <QueryProvider>
                <FingerprintTracker />
                <div className="h-screen w-screen bg-[#0d1117] text-gray-100">
                    {children}
                </div>
            </QueryProvider>
        </ClerkProvider>
    );
}
