'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RepoInfo, Theme } from '@/types/git';

export type AppTab = 'code' | 'issues' | 'pulls' | 'insights' | 'settings';

export interface AppStoreState {
  repoInfo: RepoInfo | null;
  selectedCommitHash: string | null;
  selectedBranch: string | null;
  activeTab: AppTab;
  theme: Theme;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  detailsPanelWidth: number;
  graphFilters: {
    showMergeCommits: boolean;
    showTags: boolean;
    highlightedBranches: Set<string>;
  };
}

export interface AppStoreActions {
  setRepoInfo: (repo: RepoInfo | null) => void;
  closeRepo: () => void;
  setSelectedCommitHash: (hash: string | null) => void;
  setSelectedBranch: (branch: string | null) => void;
  setActiveTab: (tab: AppTab) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setDetailsPanelWidth: (width: number) => void;
  resetLayout: () => void;
  setShowMergeCommits: (show: boolean) => void;
  toggleShowMergeCommits: () => void;
  setShowTags: (show: boolean) => void;
  toggleShowTags: () => void;
  toggleBranchHighlight: (branch: string) => void;
  clearBranchHighlights: () => void;
}

const initialState: AppStoreState = {
  repoInfo: null,
  selectedCommitHash: null,
  selectedBranch: null,
  activeTab: 'code',
  theme: 'github-dark',
  sidebarCollapsed: false,
  sidebarWidth: 250,
  detailsPanelWidth: 400,
  graphFilters: {
    showMergeCommits: true,
    showTags: true,
    highlightedBranches: new Set<string>(),
  },
};

export type AppStore = AppStoreState & AppStoreActions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,
      setRepoInfo: (repo) =>
        set(() => ({
          repoInfo: repo,
          // Clear selections on repo change to avoid stale hashes
          selectedCommitHash: null,
          selectedBranch: null,
        })),
      closeRepo: () =>
        set({
          repoInfo: null,
          selectedCommitHash: null,
          selectedBranch: null,
          activeTab: 'code',
        }),
      setSelectedCommitHash: (hash) => set({ selectedCommitHash: hash }),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setDetailsPanelWidth: (width) => set({ detailsPanelWidth: width }),
      resetLayout: () =>
        set({
          sidebarCollapsed: initialState.sidebarCollapsed,
          sidebarWidth: initialState.sidebarWidth,
          detailsPanelWidth: initialState.detailsPanelWidth,
          graphFilters: { ...initialState.graphFilters },
        }),
      setShowMergeCommits: (show) =>
        set((state) => ({
          graphFilters: { ...state.graphFilters, showMergeCommits: show },
        })),
      toggleShowMergeCommits: () =>
        set((state) => ({
          graphFilters: {
            ...state.graphFilters,
            showMergeCommits: !state.graphFilters.showMergeCommits,
          },
        })),
      setShowTags: (show) =>
        set((state) => ({
          graphFilters: { ...state.graphFilters, showTags: show },
        })),
      toggleShowTags: () =>
        set((state) => ({
          graphFilters: { ...state.graphFilters, showTags: !state.graphFilters.showTags },
        })),
      toggleBranchHighlight: (branch) =>
        set((state) => {
          const next = new Set(state.graphFilters.highlightedBranches);
          if (next.has(branch)) next.delete(branch);
          else next.add(branch);
          return { graphFilters: { ...state.graphFilters, highlightedBranches: next } };
        }),
      clearBranchHighlights: () =>
        set((state) => ({
          graphFilters: { ...state.graphFilters, highlightedBranches: new Set<string>() },
        })),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        // Fallback noop storage for SSR safety
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        repoInfo: state.repoInfo,
        selectedBranch: state.selectedBranch,
        activeTab: state.activeTab,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
        detailsPanelWidth: state.detailsPanelWidth,
        graphFilters: {
          showMergeCommits: state.graphFilters.showMergeCommits,
          showTags: state.graphFilters.showTags,
          highlightedBranches: Array.from(state.graphFilters.highlightedBranches),
        },
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as any;
        const merged = { ...currentState, ...persisted } as any;
        if (persisted?.graphFilters) {
          merged.graphFilters = {
            ...currentState.graphFilters,
            ...persisted.graphFilters,
            highlightedBranches: new Set<string>(
              persisted.graphFilters.highlightedBranches || []
            ),
          };
        }
        return merged;
      },
    }
  )
);

