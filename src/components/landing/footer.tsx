import Link from "next/link"
import Image from "next/image"

export function Footer() {
    return (
        <footer className="py-12 border-t border-border">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <Image
                            src="/logo.png"
                            alt="Synn Logo"
                            width={84}
                            height={32}
                            className="drop-shadow-lg"
                        />
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <Link
                            href="/privacy"
                            className="hover:text-foreground transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="/terms"
                            className="hover:text-foreground transition-colors"
                        >
                            Terms of Service
                        </Link>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Synn. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}
