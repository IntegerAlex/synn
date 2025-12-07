import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import appReducer from './slices/appSlice';
import viewportReducer from './slices/viewportSlice';

const appPersistConfig = {
    key: 'app',
    storage,
    whitelist: ['theme', 'sidebarCollapsed', 'sidebarWidth', 'detailsPanelWidth'],
};

const persistedAppReducer = persistReducer(appPersistConfig, appReducer);

const rootReducer = combineReducers({
    app: persistedAppReducer,
    viewport: viewportReducer,
});

export const makeStore = () => {
    return configureStore({
        reducer: rootReducer,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: {
                    ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
                },
            }),
    });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

// For persistor
let store: AppStore | undefined;
export const getStore = () => {
    if (!store) {
        store = makeStore();
    }
    return store;
};

export const getPersistor = () => persistStore(getStore());
