"use client";

import dynamic from "next/dynamic";
import { DocumentTitle } from "@/components/DocumentTitle";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { RepoSelector } from "@/components/RepoSelector";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { useAppStore } from "@/store/useAppStore";

// Lazy-load heavy tab components for code-splitting
const CytoscapeGraph = dynamic(
  () =>
    import("@/components/graph/CytoscapeGraph").then((m) => ({
      default: m.CytoscapeGraph,
    })),
  { ssr: false },
);
const Sidebar = dynamic(() =>
  import("@/components/layout/Sidebar").then((m) => ({ default: m.Sidebar })),
);
const CommitDetails = dynamic(() =>
  import("@/components/CommitDetails").then((m) => ({
    default: m.CommitDetails,
  })),
);
const IssuesTab = dynamic(() =>
  import("@/components/tabs/IssuesTab").then((m) => ({ default: m.IssuesTab })),
);
const PullRequestsTab = dynamic(() =>
  import("@/components/tabs/PullRequestsTab").then((m) => ({
    default: m.PullRequestsTab,
  })),
);
const InsightsTab = dynamic(() =>
  import("@/components/tabs/InsightsTab").then((m) => ({
    default: m.InsightsTab,
  })),
);

export default function Home() {
  const repoInfo = useAppStore((state) => state.repoInfo);
  const selectedCommitHash = useAppStore((state) => state.selectedCommitHash);
  const activeTab = useAppStore((state) => state.activeTab);

  if (!repoInfo) {
    return <RepoSelector />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d1117] overflow-hidden">
      {/* Document title - uses TanStack Query instead of useEffect */}
      <DocumentTitle />

      {/* Header */}
      <Header />

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Code tab: original layout with sidebar + graph + details */}
        {activeTab === "code" && (
          <>
            {/* Left sidebar - Branches & Files */}
            <Sidebar />

            {/* Graph takes remaining space */}
            <main className="flex-1 min-w-0">
              <CytoscapeGraph />
            </main>

            {/* Right panel - Commit details (only when commit selected) */}
            {selectedCommitHash && <CommitDetails />}
          </>
        )}

        {/* Issues tab */}
        {activeTab === "issues" && (
          <main className="flex-1 min-w-0">
            <IssuesTab />
          </main>
        )}

        {/* Pull Requests tab */}
        {activeTab === "pulls" && (
          <main className="flex-1 min-w-0">
            <PullRequestsTab />
          </main>
        )}

        {/* Insights tab */}
        {activeTab === "insights" && (
          <main className="flex-1 min-w-0">
            <InsightsTab />
          </main>
        )}

        {/* Settings tab */}
        {activeTab === "settings" && (
          <main className="flex-1 min-w-0">
            <SettingsTab />
          </main>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
