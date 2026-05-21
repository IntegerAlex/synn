import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getBlogBySlug, blogs } from "@/data/blogs";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogs.map((blog) => ({
    slug: blog.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const blog = getBlogBySlug(resolvedParams.slug);

  if (!blog) {
    return { title: "Blog Not Found" };
  }

  return {
    title: `${blog.title} | Synn Blog`,
    description: blog.description,
    authors: [{ name: blog.author, url: blog.authorUrl }],
    alternates: {
      canonical: `/blogs/${blog.slug}`,
    },
    openGraph: {
      title: blog.title,
      description: blog.description,
      type: "article",
      publishedTime: blog.date,
      authors: [blog.author],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const blog = getBlogBySlug(resolvedParams.slug);

  if (!blog) {
    notFound();
  }

  // Generate JSON-LD for AI SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: blog.description,
    author: {
      "@type": "Person",
      name: blog.author,
      url: blog.authorUrl,
    },
    datePublished: blog.date,
    dateModified: blog.date,
    publisher: {
      "@type": "Organization",
      name: "Synn",
      logo: {
        "@type": "ImageObject",
        url: "https://synn.gossorg.in/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://synn.gossorg.in/blogs/${blog.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Inject JSON-LD Schema for BlogPosting */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1 max-w-3xl mx-auto px-6 py-32 w-full">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Blogs", href: "/blogs" },
            { label: blog.title, href: `/blogs/${blog.slug}` },
          ]}
        />

        <article className="mt-8">
          <header className="mb-12 border-b border-border pb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              {blog.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a
                href={blog.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                {blog.author}
              </a>
              <span>•</span>
              <time dateTime={blog.date}>
                {new Date(blog.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
          </header>

          <div className="prose prose-invert prose-lg max-w-none text-white prose-p:text-white prose-p:leading-relaxed prose-headings:text-white prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            {blog.content.map((paragraph, idx) => (
              <p
                key={idx}
                className="mb-6 text-white"
                dangerouslySetInnerHTML={{ __html: paragraph }}
              />
            ))}
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
