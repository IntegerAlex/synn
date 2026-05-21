import type { Metadata } from "next";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "FAQ: Best Lightweight GitHub Alternative | Synn Git Client",
  description:
    "Common questions about Synn, the fast & lightweight GitHub alternative for visualizing Git history and exploring repositories without cloning.",
  alternates: {
    canonical: "/faq",
  },
};

const faqs = [
  {
    question: "What makes Synn a faster GitHub client?",
    answer:
      "Synn offloads the heavy lifting of repository visualization and file exploration to your browser using technologies like Cytoscape.js and React. By leveraging aggressive caching, efficient API proxies, and local state management, Synn provides instant navigation between branches and commits without full page reloads, making it significantly faster than the native GitHub web interface for deep exploration.",
  },
  {
    question: "Do I need to clone the repository to use Synn?",
    answer:
      "No. Synn works entirely in the cloud. It securely proxies requests to GitHub's infrastructure on your behalf, allowing you to instantly visualize and search through any repository (public or private) as if it were cloned locally, without consuming disk space or setup time.",
  },
  {
    question: "Is Synn safe to use with my private GitHub repositories?",
    answer:
      "Yes. Synn uses enterprise-grade security. Authentication is handled via Clerk and standard GitHub OAuth. Your source code is never permanently stored on our servers; we act as a secure, ephemeral proxy. We also employ RSA/AES hybrid encryption for sensitive metadata and activity logs.",
  },
  {
    question: "How does the Git graph visualization work?",
    answer:
      "Synn maps complex Git commit histories—including merge commits, branch offshoots, and tags—using an interactive, zoomable Cytoscape.js graph. This allows you to understand the architectural flow of a project at a glance, making it an essential tool for onboarding and code reviews.",
  },
  {
    question: "Can I share my visualizations with my team?",
    answer:
      "Absolutely. A core feature of Synn is the ability to generate shareable links for specific commit graphs, branches, or diff views. This 'viral' shareability makes it perfect for documenting architecture decisions, resolving merge conflicts collaboratively, or just showing off clean git histories.",
  },
];

export default function FAQPage() {
  // Generate JSON-LD for AI SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Inject JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-32 w-full">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Synn, the modern, faster
            alternative for exploring GitHub repositories.
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-secondary/20 border border-border rounded-xl p-6 hover:border-accent-main/50 transition-colors"
            >
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {faq.question}
              </h2>
              <p className="text-muted-foreground leading-relaxed text-pretty">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
