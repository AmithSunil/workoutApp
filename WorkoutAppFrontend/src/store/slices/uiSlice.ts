import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { MealSlot } from '@/types/models';

export interface ToastState {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
}

/** Transient, screen-agnostic UI state. Never persisted. */
export interface UiState {
  /** Meal the food picker will log into when it opens. */
  pendingMealSlot: MealSlot;
  rosterQuery: string;
  rosterFilter: 'all' | 'green' | 'yellow' | 'red';
  clientDetailTab: 'metrics' | 'nutrition' | 'workouts' | 'plan';
  toast: ToastState | null;
}

const initialState: UiState = {
  pendingMealSlot: 'breakfast',
  rosterQuery: '',
  rosterFilter: 'all',
  clientDetailTab: 'metrics',
  toast: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    pendingMealSlotChanged(state, action: PayloadAction<MealSlot>) {
      state.pendingMealSlot = action.payload;
    },
    rosterQueryChanged(state, action: PayloadAction<string>) {
      state.rosterQuery = action.payload;
    },
    rosterFilterChanged(state, action: PayloadAction<UiState['rosterFilter']>) {
      state.rosterFilter = action.payload;
    },
    clientDetailTabChanged(state, action: PayloadAction<UiState['clientDetailTab']>) {
      state.clientDetailTab = action.payload;
    },
    toastShown(state, action: PayloadAction<Omit<ToastState, 'id'>>) {
      state.toast = { ...action.payload, id: `${Date.now()}` };
    },
    toastDismissed(state) {
      state.toast = null;
    },
  },
});

export const {
  pendingMealSlotChanged,
  rosterQueryChanged,
  rosterFilterChanged,
  clientDetailTabChanged,
  toastShown,
  toastDismissed,
} = uiSlice.actions;

export default uiSlice.reducer;
