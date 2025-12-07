"use client"

import Link from "next/link"
import Image from "next/image"

export default function WhyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Synn" width={40} height={40} />
            <span className="font-bold text-xl">Synn</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Why I Built Synn</h1>
        <p className="text-muted-foreground mb-8">A developer's journey from frustration to solution</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <p className="text-muted-foreground leading-relaxed text-lg">
              I was frustrated with managing multiple branches and working across different environments. 
              Explaining to the team why we needed GitKraken Pro wasn't worth it, especially when GitHub CLI 
              was sufficient for most tasks.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">The Problem</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you're working with tens or even fifties of branches across multiple environments, 
              managing and visualizing your Git history becomes a real challenge. Traditional tools either 
              cost too much, don't give you enough control, or don't fit your workflow.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              GitHub CLI is powerful, but when complexity scales, multiple branches, different environments, 
              complex merge histories, you need visualization. You need to see the big picture, understand 
              relationships, and make sense of your repository's evolution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">The Solution</h2>
            <p className="text-muted-foreground leading-relaxed">
              So I built Synn. I built it in a way where I can control my data, encrypt it, and own my code, 
              as well as help others do the same.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Synn gives you the visualization you need without the enterprise price tag. It's built with 
              privacy and security in mind, your data is encrypted, you control what's stored, and the code 
              is yours to understand and trust.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Built for Developers, by a Developer</h2>
            <p className="text-muted-foreground leading-relaxed">
              Synn isn't just another tool, it's a solution born from real frustration. It's designed for 
              developers who need clarity in their Git workflows, who value their data privacy, and who want 
              tools that work the way they do.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Whether you're managing a handful of branches or dozens, working solo or with a team, Synn 
              helps you visualize, understand, and master your repository's history.
            </p>
          </section>

          <section className="pt-8 border-t border-border/30">
            <p className="text-muted-foreground leading-relaxed">
              <Link href="/app" className="text-primary hover:underline">
                Try Synn today
              </Link> and see your Git history in a whole new way.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

