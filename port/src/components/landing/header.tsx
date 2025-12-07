"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, Github } from "lucide-react"

export function Header() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const navLinks = [
        { href: "#features", label: "Features" },
        { href: "#showcase", label: "Product" },
    ]

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/80 backdrop-blur-xl border-b border-border" : "bg-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="relative">
                            <svg
                                viewBox="0 0 32 32"
                                className="w-8 h-8 text-primary transition-transform duration-300 group-hover:scale-110"
                                fill="none"
                            >
                                <path d="M16 4L4 28h8l4-8 4 8h8L16 4z" fill="currentColor" />
                                <circle cx="16" cy="12" r="3" fill="hsl(var(--background))" />
                            </svg>
                        </div>
                        <span className="text-xl font-semibold text-foreground tracking-tight">Synn</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link href="https://github.com/IntegerAlex/cracked" target="_blank">
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                <Github className="w-4 h-4 mr-2" />
                                GitHub
                            </Button>
                        </Link>
                        <Link href="/app">
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                Open App
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 text-muted-foreground hover:text-foreground"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-border">
                        <nav className="flex flex-col gap-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <div className="flex flex-col gap-2 pt-4 border-t border-border">
                                <Link href="https://github.com/IntegerAlex/cracked" target="_blank">
                                    <Button variant="ghost" size="sm" className="justify-start w-full">
                                        <Github className="w-4 h-4 mr-2" />
                                        GitHub
                                    </Button>
                                </Link>
                                <Link href="/app">
                                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">
                                        Open App
                                    </Button>
                                </Link>
                            </div>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    )
}
