import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ViewportState {
    x: number;
    y: number;
    zoom: number;
    width: number;
    height: number;
}

interface ViewportSliceState {
    viewport: ViewportState;
    commitLimit: number | 'all';
    isRendererReady: boolean;
}

const initialState: ViewportSliceState = {
    viewport: { x: 0, y: 0, zoom: 1, width: 800, height: 600 },
    commitLimit: 200,
    isRendererReady: false,
};

export const viewportSlice = createSlice({
    name: 'viewport',
    initialState,
    reducers: {
        setViewport: (state, action: PayloadAction<Partial<ViewportState>>) => {
            state.viewport = { ...state.viewport, ...action.payload };
        },
        setCommitLimit: (state, action: PayloadAction<number | 'all'>) => {
            state.commitLimit = action.payload;
        },
        setRendererReady: (state, action: PayloadAction<boolean>) => {
            state.isRendererReady = action.payload;
        },
    },
});

export const { setViewport, setCommitLimit, setRendererReady } = viewportSlice.actions;

export default viewportSlice.reducer;
