'use client';

import type { RepoInfo } from '@/types/git';

export interface ShareableViewState {
  repo: string; // repo path (owner/repo)
  branch?: string;
  selectedCommit?: string;
  showMergeCommits?: boolean;
  showTags?: boolean;
  highlightedBranches?: string[];
  graphLimit?: number;
}

/**
 * Encode view state into a shareable URL
 */
export function encodeViewState(state: ShareableViewState): string {
  const params = new URLSearchParams();
  params.set('repo', state.repo);
  if (state.branch) params.set('branch', state.branch);
  if (state.selectedCommit) params.set('commit', state.selectedCommit);
  if (state.showMergeCommits === false) params.set('merge', '0');
  if (state.showTags === false) params.set('tags', '0');
  if (state.highlightedBranches && state.highlightedBranches.length > 0) {
    params.set('highlight', state.highlightedBranches.join(','));
  }
  if (state.graphLimit && state.graphLimit !== 500) {
    params.set('limit', String(state.graphLimit));
  }

  const encoded = params.toString();
  // Use base64url encoding for cleaner share IDs
  if (encoded.length > 100) {
    // For long states, use base64url encoding
    const base64 = btoa(JSON.stringify(state))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return base64;
  }
  return encoded;
}

/**
 * Decode view state from URL params or base64 string
 */
export function decodeViewState(encoded: string): ShareableViewState | null {
  try {
    // Try parsing as base64 first (if it's long and doesn't contain =)
    if (encoded.length > 50 && !encoded.includes('=') && !encoded.includes('&')) {
      try {
        const decoded = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded) as ShareableViewState;
      } catch {
        // Fall through to URL params parsing
      }
    }

    // Parse as URL params
    const params = new URLSearchParams(encoded);
    const state: ShareableViewState = {
      repo: params.get('repo') || '',
    };

    if (params.has('branch')) state.branch = params.get('branch') || undefined;
    if (params.has('commit')) state.selectedCommit = params.get('commit') || undefined;
    if (params.has('merge')) state.showMergeCommits = params.get('merge') !== '0';
    if (params.has('tags')) state.showTags = params.get('tags') !== '0';
    if (params.has('highlight')) {
      state.highlightedBranches = params.get('highlight')?.split(',').filter(Boolean) || [];
    }
    if (params.has('limit')) {
      const limit = parseInt(params.get('limit') || '500', 10);
      if (Number.isFinite(limit)) state.graphLimit = limit;
    }

    return state.repo ? state : null;
  } catch {
    return null;
  }
}

/**
 * Generate shareable URL from current view state
 */
export function generateShareUrl(state: ShareableViewState): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const encoded = encodeViewState(state);
  return `${baseUrl}/share/${encoded}`;
}

/**
 * Extract view state from current app store
 */
export function getCurrentViewState(
  repoInfo: RepoInfo | null,
  selectedBranch: string | null,
  selectedCommit: string | null,
  graphFilters: {
    showMergeCommits: boolean;
    showTags: boolean;
    highlightedBranches: Set<string>;
  },
  graphLimit: number
): ShareableViewState | null {
  if (!repoInfo) return null;

  return {
    repo: repoInfo.path,
    branch: selectedBranch || undefined,
    selectedCommit: selectedCommit || undefined,
    showMergeCommits: graphFilters.showMergeCommits,
    showTags: graphFilters.showTags,
    highlightedBranches:
      graphFilters.highlightedBranches.size > 0
        ? Array.from(graphFilters.highlightedBranches)
        : undefined,
    graphLimit: graphLimit !== 500 ? graphLimit : undefined,
  };
}
