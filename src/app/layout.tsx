import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({ 
    subsets: ["latin"], 
    variable: "--font-sans",
    weight: ["400", "500", "600", "700", "800"],
});
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
    title: "Synn",
    description: "Visualize your Git history like never before. Track branches, explore commits, and master your repository with Synn.",
    keywords: ["git", "visualization", "github", "version control", "git graph", "commit history", "branch tracking"],
    authors: [{ name: "Synn" }],
    creator: "Synn",
    publisher: "Synn",
    metadataBase: new URL("https://synn.gossorg.in"),
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://synn.gossorg.in",
        siteName: "Synn",
        title: "Synn - Git Visualization for Modern Developers",
        description: "Visualize your Git history like never before. Track branches, explore commits, and master your repository with Synn.",
        images: [
            {
                url: "/logo.png",
                width: 1200,
                height: 630,
                alt: "Synn Logo",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Synn - Git Visualization for Modern Developers",
        description: "Visualize your Git history like never before. Track branches, explore commits, and master your repository with Synn.",
        images: ["/logo.png"],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "any" },
            { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
            { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        ],
        apple: [
            { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
        shortcut: "/favicon.ico",
    },
    manifest: "/site.webmanifest",
    verification: {
        // Add verification codes if needed
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`font-sans antialiased ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
                <ErrorBoundary>
                    <Providers>
                        {children}
                    </Providers>
                </ErrorBoundary>
            </body>
        </html>
    );
}
