import Link from "next/link";

const achievements = [
  {
    title: "Graph visualization core",
    detail:
      "Interactive Git history graph with repo insights and streamlined navigation.",
  },
  {
    title: "GitHub integration",
    detail: "Repo syncing, commits, and graph rendering across branches.",
  },
  {
    title: "Profile (/profile)",
    detail:
      "Roast, contributions graph, and profile details with Clerk session support.",
  },
  {
    title: "Clerk integration",
    detail: "Hosted authentication with sessions and secure admin gating.",
  },
  {
    title: "International compliance",
    detail: "Improved privacy/legal readiness for global users.",
  },
  //   { title: "PK-only admin auth", detail: "Challenge/response with on-device signing and 1-hour session token." },
  //   { title: "Security & audit dashboard", detail: "Unified logs, API tracing, alerts, usage insights, and CSV export." },
  //   { title: "Admin UX refresh", detail: "Collapsible navigation, filters, interactive charts, users + repos drilldown." },
];

const upcoming = [
  {
    title: "Multi-branch selection",
    detail: "Compare and visualize multiple branches side-by-side.",
  },
  {
    title: "Collaboration",
    detail: "Shared views, comments, and mentions for team workflows.",
  },
  {
    title: "Merging workflow",
    detail: "Guided merge flows with conflict surfacing and approvals.",
  },
  {
    title: "Inline file editor",
    detail: "Edit files directly from the graph view with safe commits.",
  },
];

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-primary/70">
            Roadmap
          </p>
          <h1 className="text-4xl font-bold">
            What&apos;s shipping now and next
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            A living overview of what we&apos;ve delivered and where we&apos;re
            going.
          </p>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recently shipped</h2>
            <Link
              href="/"
              className="text-sm text-primary hover:text-primary/80"
            >
              Back to home
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {achievements.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border/60 bg-card/70 p-4 shadow-lg shadow-black/10"
              >
                <div className="text-sm font-semibold text-primary mb-1">
                  Shipped
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Upcoming</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border/60 bg-card/50 p-4 shadow-lg shadow-black/5"
              >
                <div className="text-sm font-semibold text-amber-400 mb-1">
                  Planned
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
