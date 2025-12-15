"use client"

import Link from "next/link"
import Image from "next/image"

export function Footer() {
    return (
        <footer className="relative py-16 border-t border-border/50 bg-gradient-to-t from-background via-background to-background/95">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex flex-col gap-8">
                    {/* Main footer content */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                        {/* Logo section */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <Image
                                    src="/logo.png"
                                    alt="Synn Logo"
                                    width={100}
                                    height={38}
                                    sizes="100px"
                                    className="drop-shadow-lg"
                                />
                            </div>
                            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                                Visualize your Git history like never before.
                            </p>
                        </div>

                        {/* Links section */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2">
                                    Legal
                                </h3>
                                <div className="flex flex-col gap-3">
                                    <Link
                                        href="/privacy"
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 hover:translate-x-1 inline-block w-fit"
                                    >
                                        Privacy Policy
                                    </Link>
                                    <Link
                                        href="/why"
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 hover:translate-x-1 inline-block w-fit"
                                    >
                                        Why I Built Synn
                                    </Link>
                                    <Link
                                        href="/terms"
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 hover:translate-x-1 inline-block w-fit"
                                    >
                                        Terms of Service
                                    </Link>
                                    <Link
                                        href="/roadmap"
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 hover:translate-x-1 inline-block w-fit"
                                    >
                                        Roadmap
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-muted-foreground/80">
                            © {new Date().getFullYear()} Synn. All rights reserved.
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                            <span>Built with</span>
                            <span className="text-primary/60">🔥</span>
                            <span>for developers</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
