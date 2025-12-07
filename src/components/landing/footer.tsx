import Link from "next/link"
import Image from "next/image"
import { Github } from "lucide-react"

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
                        {/* <span className="font-semibold text-foreground">Synn</span> */}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        {/* <span></span> */}
                        {/* <Link
                            href="https://github.com/IntegerAlex"
                            target="_blank"
                            className="flex items-center gap-2 hover:text-foreground transition-colors"
                        >
                            <Github className="w-4 h-4" />
                            GitHub
                        </Link> */}
                    </div>

                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Synn. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}
