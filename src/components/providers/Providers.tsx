'use client';

import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "./QueryProvider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider>
            <QueryProvider>
                {children}
            </QueryProvider>
        </ClerkProvider>
    );
}
