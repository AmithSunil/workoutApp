import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { UserRole } from '@/types/models';
import { TODAY } from '@/utils/date';

/**
 * Who is using the app right now.
 *
 * In production this is hydrated from the auth provider; here a role switcher on
 * the launch screen writes into it, which is what drives the role-based routing
 * in `src/app/_layout.tsx`.
 */
export interface SessionState {
  role: UserRole | null;
  /** Identity of the signed-in user (client id or trainer id). */
  userId: string | null;
  /** Client whose data the current screens read — self for clients, selection for trainers. */
  activeClientId: string | null;
  /** Date the client-side logging screens are scoped to. */
  activeDate: string;
  hydrated: boolean;
}

const initialState: SessionState = {
  role: null,
  userId: null,
  activeClientId: null,
  activeDate: TODAY,
  hydrated: false,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    signedInAsClient(state, action: PayloadAction<{ clientId: string }>) {
      state.role = 'client';
      state.userId = action.payload.clientId;
      state.activeClientId = action.payload.clientId;
      state.activeDate = TODAY;
    },
    signedInAsTrainer(state, action: PayloadAction<{ trainerId: string }>) {
      state.role = 'trainer';
      state.userId = action.payload.trainerId;
      state.activeClientId = null;
    },
    signedOut(state) {
      state.role = null;
      state.userId = null;
      state.activeClientId = null;
      state.activeDate = TODAY;
    },
    activeClientChanged(state, action: PayloadAction<string | null>) {
      state.activeClientId = action.payload;
    },
    activeDateChanged(state, action: PayloadAction<string>) {
      state.activeDate = action.payload;
    },
    hydrated(state, action: PayloadAction<SessionState | null>) {
      if (action.payload) {
        Object.assign(state, action.payload);
      }
      state.hydrated = true;
    },
  },
});

export const {
  signedInAsClient,
  signedInAsTrainer,
  signedOut,
  activeClientChanged,
  activeDateChanged,
  hydrated,
} = sessionSlice.actions;

export default sessionSlice.reducer;
