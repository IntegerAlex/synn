"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { GitBranch, GitCommitHorizontal, GitMerge, Github } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

const features = [
    {
        icon: GitBranch,
        title: "Branch Visualization",
        description:
            "See your entire repository history as an interactive graph. Navigate complex merge histories with clarity.",
    },
    {
        icon: GitCommitHorizontal,
        title: "Commit Insights",
        description: "Deep dive into every commit. View diffs, authors, timestamps, and file changes at a glance.",
    },
    {
        icon: GitMerge,
        title: "Merge Tracking",
        description: "Track merges and branch lifecycles. Understand how your code evolves over time.",
    },
    {
        icon: Github,
        title: "GitHub Import",
        description: "Sign in with GitHub and import any of your repositories directly. No manual cloning required.",
    },
]

export function FeaturesSection() {
    const sectionRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                ".feature-card",
                { opacity: 0, y: 40 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    stagger: 0.1,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top 70%",
                    },
                },
            )
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    return (
        <section ref={sectionRef} id="features" className="py-24 md:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="max-w-2xl mb-16">
                    <p className="text-primary text-sm font-medium mb-3">Features</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
                        Everything you need to explore Git
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Powerful tools designed to make version control intuitive and visual.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="feature-card group p-6 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/20 transition-all duration-300"
                        >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                                <feature.icon className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
