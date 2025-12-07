import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
    title: "Synn — Git Visualization for Modern Developers",
    description: "Visualize your Git history like never before. Track branches, explore commits, and master your repository with Synn.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`font-sans antialiased ${inter.variable} ${jetbrainsMono.variable}`}>
                {children}
            </body>
        </html>
    );
}
