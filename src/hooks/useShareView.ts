"use client";

import { useMutation } from "@tanstack/react-query";

export interface ShareViewState {
  repoFullName: string;
  branch?: string;
  selectedCommit?: string | null;
  graphFilters?: {
    showMergeCommits: boolean;
    showTags: boolean;
    highlightedBranches: string[];
  };
  graphLimit?: number;
}

export interface ShareViewResponse {
  shareId: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
}

export function useShareView() {
  return useMutation<ShareViewResponse, Error, ShareViewState>({
    mutationFn: async (viewState) => {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: viewState.repoFullName,
          viewState: {
            branch: viewState.branch,
            selectedCommit: viewState.selectedCommit,
            graphFilters: viewState.graphFilters,
            graphLimit: viewState.graphLimit,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create share");
      }

      const data = await response.json();
      return data.data;
    },
  });
}
