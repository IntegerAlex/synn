import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RepoInfo, Theme } from '@/types/git';

interface AppState {
    repoInfo: RepoInfo | null;
    selectedCommitHash: string | null;
    selectedBranch: string | null;
    theme: Theme;
    sidebarCollapsed: boolean;
    sidebarWidth: number;
    detailsPanelWidth: number;
}

const initialState: AppState = {
    repoInfo: null,
    selectedCommitHash: null,
    selectedBranch: null,
    theme: 'github-dark',
    sidebarCollapsed: false,
    sidebarWidth: 250,
    detailsPanelWidth: 400,
};

export const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        setRepoInfo: (state, action: PayloadAction<RepoInfo | null>) => {
            state.repoInfo = action.payload;
        },
        setSelectedCommitHash: (state, action: PayloadAction<string | null>) => {
            state.selectedCommitHash = action.payload;
        },
        setSelectedBranch: (state, action: PayloadAction<string | null>) => {
            state.selectedBranch = action.payload;
        },
        setTheme: (state, action: PayloadAction<Theme>) => {
            state.theme = action.payload;
        },
        toggleSidebar: (state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
        },
        setSidebarWidth: (state, action: PayloadAction<number>) => {
            state.sidebarWidth = action.payload;
        },
        setDetailsPanelWidth: (state, action: PayloadAction<number>) => {
            state.detailsPanelWidth = action.payload;
        },
    },
});

export const {
    setRepoInfo,
    setSelectedCommitHash,
    setSelectedBranch,
    setTheme,
    toggleSidebar,
    setSidebarWidth,
    setDetailsPanelWidth,
} = appSlice.actions;

export default appSlice.reducer;
