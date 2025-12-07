'use client';

import { useAppSelector } from '@/store/hooks';
import { RepoSelector } from '@/components/RepoSelector';
import { CanvasGraph } from '@/components/graph/CanvasGraph';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CommitDetails } from '@/components/CommitDetails';
import { DocumentTitle } from '@/components/DocumentTitle';

export default function Home() {
  const repoInfo = useAppSelector((state) => state.app.repoInfo);
  const selectedCommitHash = useAppSelector((state) => state.app.selectedCommitHash);

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
        {/* Left sidebar - Branches */}
        <Sidebar />

        {/* Graph takes remaining space */}
        <main className="flex-1 min-w-0">
          <CanvasGraph />
        </main>

        {/* Right panel - Commit details (only when commit selected) */}
        {selectedCommitHash && <CommitDetails />}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
