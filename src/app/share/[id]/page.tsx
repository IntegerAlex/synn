'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { CytoscapeGraph } from '@/components/graph/CytoscapeGraph';
import { useAppStore } from '@/store/useAppStore';
import { useEffect, useState } from 'react';
import type { RepoInfo } from '@/types/git';

interface SharedViewData {
  shareId: string;
  repoFullName: string;
  viewState: {
    branch?: string;
    selectedCommit?: string | null;
    graphFilters?: {
      showMergeCommits: boolean;
      showTags: boolean;
      highlightedBranches: string[];
    };
    graphLimit?: number;
  };
  title?: string;
  description?: string;
  createdAt: string;
  expiresAt: string | null;
  viewCount: number;
}

async function fetchSharedView(shareId: string): Promise<SharedViewData> {
  const response = await fetch(`/api/share/${shareId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to load shared view');
  }
  const data = await response.json();
  return data.data;
}

export default function SharedViewPage() {
  const params = useParams();
  const shareId = params.id as string;
  const setRepoInfo = useAppStore((state) => state.setRepoInfo);
  const setSelectedBranch = useAppStore((state) => state.setSelectedBranch);
  const setSelectedCommitHash = useAppStore((state) => state.setSelectedCommitHash);
  const setShowMergeCommits = useAppStore((state) => state.setShowMergeCommits);
  const setShowTags = useAppStore((state) => state.setShowTags);
  const toggleBranchHighlight = useAppStore((state) => state.toggleBranchHighlight);
  const clearBranchHighlights = useAppStore((state) => state.clearBranchHighlights);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['sharedView', shareId],
    queryFn: () => fetchSharedView(shareId),
    enabled: !!shareId,
  });

  // Calculate and update countdown timer
  useEffect(() => {
    if (!data?.expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expires = new Date(data.expiresAt!).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`Expires in ${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`Expires in ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`Expires in ${seconds}s`);
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [data?.expiresAt]);

  // Apply shared view state when data loads
  useEffect(() => {
    if (!data) return;

    // Set repo info
    const repoInfo: RepoInfo = {
      path: data.repoFullName,
      name: data.repoFullName.split('/').pop() || data.repoFullName,
      currentBranch: data.viewState.branch || 'main',
      isClean: true,
      ahead: 0,
      behind: 0,
      remotes: [],
    };
    setRepoInfo(repoInfo);

    // Set branch
    if (data.viewState.branch) {
      setSelectedBranch(data.viewState.branch);
    }

    // Set selected commit
    if (data.viewState.selectedCommit) {
      setSelectedCommitHash(data.viewState.selectedCommit);
    }

    // Apply graph filters
    if (data.viewState.graphFilters) {
      setShowMergeCommits(data.viewState.graphFilters.showMergeCommits);
      setShowTags(data.viewState.graphFilters.showTags);
      clearBranchHighlights();
      for (const branch of data.viewState.graphFilters.highlightedBranches) {
        toggleBranchHighlight(branch);
      }
    }
  }, [
    data,
    setRepoInfo,
    setSelectedBranch,
    setSelectedCommitHash,
    setShowMergeCommits,
    setShowTags,
    toggleBranchHighlight,
    clearBranchHighlights,
  ]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0d1117]">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-t-transparent border-[#ef4444] rounded-full animate-spin" />
          <span>Loading shared view...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-lg font-semibold">Failed to load shared view</div>
          <div className="text-gray-400 text-sm">
            {error instanceof Error ? error.message : 'Shared view not found or expired'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d1117] overflow-hidden">
      {/* Header */}
      <div className="flex-none px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-gray-200">
              {data.title || 'Shared Synn View'}
            </div>
            {data.description && (
              <div className="text-xs text-gray-400">{data.description}</div>
            )}
            <div className="text-xs text-gray-500">
              {data.repoFullName} • {data.viewCount} views
            </div>
            {timeRemaining && (
              <div className="text-xs text-yellow-400">
                {timeRemaining}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">Read-only Synn view</div>
        </div>
      </div>

      {/* Graph */}
      <main className="flex-1 min-w-0 min-h-0">
        <CytoscapeGraph initialGraphLimit={data.viewState.graphLimit} readOnly={true} shareId={shareId} />
      </main>
    </div>
  );
}
