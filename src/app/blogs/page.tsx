import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { blogs } from "@/data/blogs";

export const metadata: Metadata = {
  title: "Blog: GitHub Alternatives & Lightweight Git Visualization",
  description:
    "Insights on lightweight GitHub alternatives, Git visualization tools, and building the fastest GitHub client for modern engineering teams.",
  alternates: {
    canonical: "/blogs",
  },
};

export default function BlogsIndexPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-32 w-full">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Blogs", href: "/blogs" },
          ]}
        />

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Synn Blog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Insights on building a faster GitHub client, Git visualization, and
            improving your workflow.
          </p>
        </div>

        <div className="grid gap-8">
          {blogs.map((blog) => (
            <Link key={blog.slug} href={`/blogs/${blog.slug}`}>
              <article className="group bg-secondary/10 border border-border rounded-2xl p-6 md:p-8 hover:border-accent-main/50 hover:bg-secondary/20 transition-all duration-300">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <time dateTime={blog.date}>
                    {new Date(blog.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                  <span>•</span>
                  <span>{blog.author}</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {blog.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed line-clamp-2">
                  {blog.description}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
