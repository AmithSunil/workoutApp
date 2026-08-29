import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { baseApi } from '@/api/baseApi';
import sessionReducer from './slices/sessionSlice';
import uiReducer from './slices/uiSlice';
import workoutDraftReducer from './slices/workoutDraftSlice';

// Endpoint modules must be imported for their `injectEndpoints` side effect,
// otherwise the hooks they export are never registered on `baseApi`.
import '@/api/endpoints/nutritionApi';
import '@/api/endpoints/workoutsApi';
import '@/api/endpoints/progressApi';
import '@/api/endpoints/messagingApi';
import '@/api/endpoints/trainerApi';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    session: sessionReducer,
    ui: uiReducer,
    workoutDraft: workoutDraftReducer,
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  devTools: __DEV__,
});

// Enables refetchOnFocus / refetchOnReconnect behaviour.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
