import Link from "next/link"
import { Github } from "lucide-react"

export function Footer() {
    return (
        <footer className="py-12 border-t border-border">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <svg
                            viewBox="0 0 32 32"
                            className="w-6 h-6 text-primary"
                            fill="none"
                        >
                            <path d="M16 4L4 28h8l4-8 4 8h8L16 4z" fill="currentColor" />
                            <circle cx="16" cy="12" r="3" fill="hsl(var(--background))" />
                        </svg>
                        <span className="font-semibold text-foreground">Synn</span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span>Open source Git visualizer</span>
                        <Link
                            href="https://github.com/IntegerAlex/cracked"
                            target="_blank"
                            className="flex items-center gap-2 hover:text-foreground transition-colors"
                        >
                            <Github className="w-4 h-4" />
                            GitHub
                        </Link>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Synn. MIT License.
                    </p>
                </div>
            </div>
        </footer>
    )
}
