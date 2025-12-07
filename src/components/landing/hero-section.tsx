"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { gsap } from "gsap"
import { Button } from "@/components/ui/button"
import { ArrowRight, Github } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

            tl.fromTo(".hero-badge", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 })
                .fromTo(".hero-title", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8 }, "-=0.3")
                .fromTo(".hero-subtitle", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.4")
                .fromTo(".hero-cta", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }, "-=0.3")
        }, containerRef)

        return () => ctx.revert()
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener("resize", resize)

        interface Node {
            x: number
            y: number
            vx: number
            vy: number
            radius: number
        }

        const nodes: Node[] = []
        const nodeCount = 40

        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 2 + 1,
            })
        }

        let animationId: number
        const animate = () => {
            ctx.fillStyle = "hsl(0 0% 2%)"
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            nodes.forEach((node, i) => {
                node.x += node.vx
                node.y += node.vy

                if (node.x < 0 || node.x > canvas.width) node.vx *= -1
                if (node.y < 0 || node.y > canvas.height) node.vy *= -1

                nodes.forEach((other, j) => {
                    if (i === j) return
                    const dx = node.x - other.x
                    const dy = node.y - other.y
                    const dist = Math.sqrt(dx * dx + dy * dy)

                    if (dist < 150) {
                        ctx.beginPath()
                        ctx.moveTo(node.x, node.y)
                        ctx.lineTo(other.x, other.y)
                        ctx.strokeStyle = `hsla(356, 100%, 35%, ${0.1 * (1 - dist / 150)})`
                        ctx.lineWidth = 0.5
                        ctx.stroke()
                    }
                })

                ctx.beginPath()
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
                ctx.fillStyle = "hsla(356, 100%, 40%, 0.4)"
                ctx.fill()
            })

            animationId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener("resize", resize)
            cancelAnimationFrame(animationId)
        }
    }, [])

    return (
        <section ref={containerRef} className="relative min-h-screen flex items-center justify-center pt-16">
            <canvas ref={canvasRef} className="absolute inset-0 opacity-50" />

            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

            <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center">
                {/* <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                </div> */}

                {/* Logo */}
                <div className="hero-title mb-8 flex justify-center">
                    <div className="relative">
                        <Image
                            src="/logo.png"
                            alt="Synn Logo"
                            width={280}
                            height={280}
                            className="drop-shadow-2xl"
                            priority
                        />
                    </div>
                </div>

                <h1 className="hero-title text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight mb-6">
                    <span className="text-balance">
                        Visualize your Git history
                        <br />
                        <span className="text-primary">like never before (for free)</span>
                    </span>
                </h1>

                <p className="hero-subtitle text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed text-pretty">
                    Import repositories from GitHub or open local repos. Explore branches, commits, and merges
                    with a beautiful interactive graph.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/app">
                        <Button
                            size="lg"
                            className="hero-cta bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-medium"
                        >
                            Open Synn
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </Link>
                    {/* <Link href="https://github.com/IntegerAlex" target="_blank">
                        <Button
                            variant="outline"
                            size="lg"
                            className="hero-cta border-border bg-transparent hover:bg-secondary text-foreground px-8 h-12 text-base font-medium"
                        >
                            <Github className="mr-2 w-4 h-4" />
                            View Source
                        </Button>
                    </Link> */}
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </section>
    )
}
