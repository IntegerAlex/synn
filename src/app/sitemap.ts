import { MetadataRoute } from "next";
import { blogs } from "@/data/blogs";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://synn.gossorg.in";

  // Base static routes
  const staticRoutes = [
    { path: "", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/app", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/blogs", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/faq", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/roadmap", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/profile", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/why", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/terms", priority: 0.5, changeFrequency: "monthly" as const },
  ].map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Dynamic blog routes
  const blogRoutes = blogs.map((blog) => ({
    url: `${baseUrl}/blogs/${blog.slug}`,
    lastModified: new Date(blog.date),
    changeFrequency: "monthly" as const,
    priority: 0.7, // Articles usually sit around 0.7
  }));

  return [...staticRoutes, ...blogRoutes];
}
