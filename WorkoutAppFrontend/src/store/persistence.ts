import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SessionState } from './slices/sessionSlice';

const SESSION_KEY = 'workoutapp:session:v1';

type PersistedSession = Pick<SessionState, 'role' | 'userId' | 'activeClientId'>;

/**
 * Only the identity slice is persisted. Server data lives in the RTK Query
 * cache and is intentionally re-fetched on cold start; UI state is transient.
 */
export const loadSession = async (): Promise<PersistedSession | null> => {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    return parsed.role && parsed.userId ? parsed : null;
  } catch {
    return null;
  }
};

export const saveSession = async (session: PersistedSession): Promise<void> => {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Persistence is best-effort; a failure must never block navigation.
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // no-op
  }
};
