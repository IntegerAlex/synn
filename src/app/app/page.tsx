'use client';

import { useAppStore } from '@/store/useAppStore';
import { RepoSelector } from '@/components/RepoSelector';
import { CytoscapeGraph } from '@/components/graph/CytoscapeGraph';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CommitDetails } from '@/components/CommitDetails';
import { DocumentTitle } from '@/components/DocumentTitle';
import { IssuesTab } from '@/components/tabs/IssuesTab';
import { PullRequestsTab } from '@/components/tabs/PullRequestsTab';
import { InsightsTab } from '@/components/tabs/InsightsTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';

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
        {activeTab === 'code' && (
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
        {activeTab === 'issues' && (
          <main className="flex-1 min-w-0">
            <IssuesTab />
          </main>
        )}

        {/* Pull Requests tab */}
        {activeTab === 'pulls' && (
          <main className="flex-1 min-w-0">
            <PullRequestsTab />
          </main>
        )}

        {/* Insights tab */}
        {activeTab === 'insights' && (
          <main className="flex-1 min-w-0">
            <InsightsTab />
          </main>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
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
