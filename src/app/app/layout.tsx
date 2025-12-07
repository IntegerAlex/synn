'use client';

import { ClerkProvider } from "@clerk/nextjs";
import { StoreProvider } from "@/store/StoreProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            <StoreProvider>
                <QueryProvider>
                    <div className="h-screen w-screen bg-[#0d1117] text-gray-100">
                        {children}
                    </div>
                </QueryProvider>
            </StoreProvider>
        </ClerkProvider>
    );
}
