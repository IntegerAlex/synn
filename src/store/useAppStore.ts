'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RepoInfo, Theme } from '@/types/git';

export interface AppStoreState {
  repoInfo: RepoInfo | null;
  selectedCommitHash: string | null;
  selectedBranch: string | null;
  theme: Theme;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  detailsPanelWidth: number;
}

export interface AppStoreActions {
  setRepoInfo: (repo: RepoInfo | null) => void;
  closeRepo: () => void;
  setSelectedCommitHash: (hash: string | null) => void;
  setSelectedBranch: (branch: string | null) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setDetailsPanelWidth: (width: number) => void;
  resetLayout: () => void;
}

const initialState: AppStoreState = {
  repoInfo: null,
  selectedCommitHash: null,
  selectedBranch: null,
  theme: 'github-dark',
  sidebarCollapsed: false,
  sidebarWidth: 250,
  detailsPanelWidth: 400,
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
        }),
      setSelectedCommitHash: (hash) => set({ selectedCommitHash: hash }),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
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
        }),
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
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
        detailsPanelWidth: state.detailsPanelWidth,
      }),
    }
  )
);

