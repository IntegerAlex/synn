'use client';

import { useAppStore } from '@/store/useAppStore';
import { RepoSelector } from '@/components/RepoSelector';
import { CytoscapeGraph } from '@/components/graph/CytoscapeGraph';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CommitDetails } from '@/components/CommitDetails';
import { DocumentTitle } from '@/components/DocumentTitle';
import Link from 'next/link';
import { User } from 'lucide-react';

export default function Home() {
  const repoInfo = useAppStore((state) => state.repoInfo);
  const selectedCommitHash = useAppStore((state) => state.selectedCommitHash);

  if (!repoInfo) {
    return <RepoSelector />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d1117] overflow-hidden">
      {/* Document title - uses TanStack Query instead of useEffect */}
      <DocumentTitle />
      
      {/* Header */}
      <Header />

      {/* Profile Button - Floating */}
      <Link
        href="/profile"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border border-[#30363d] hover:border-[#ef4444]/50 text-gray-400 hover:text-[#ef4444] rounded-lg shadow-lg hover:bg-[#21262d] transition-all"
        title="View Profile"
      >
        <User className="w-4 h-4" />
        <span className="text-sm font-medium">Profile</span>
      </Link>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar - Branches */}
        <Sidebar />

        {/* Graph takes remaining space */}
        <main className="flex-1 min-w-0">
          <CytoscapeGraph />
        </main>

        {/* Right panel - Commit details (only when commit selected) */}
        {selectedCommitHash && <CommitDetails />}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
