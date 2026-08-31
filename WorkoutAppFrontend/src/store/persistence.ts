import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserRole } from '@/types/models';

const IDENTITY_KEY = 'workoutapp:identity:v2';

/**
 * The resolved app identity for one Supabase account.
 *
 * Supabase persists the *session* itself; what it cannot know is which app user
 * that session maps to, which otherwise costs an RPC round trip on every cold
 * start. Caching the answer against the auth uuid lets a returning user land on
 * their own screens immediately, with the real lookup reconciling behind them.
 *
 * `authUserId` is part of the record, not just the key, so a cache written for
 * one account can never be adopted by another.
 */
export interface CachedIdentity {
  authUserId: string;
  userId: string;
  role: UserRole;
}

const isCachedIdentity = (value: unknown): value is CachedIdentity => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.authUserId === 'string' &&
    typeof record.userId === 'string' &&
    (record.role === 'client' || record.role === 'trainer')
  );
};

export const loadIdentity = async (): Promise<CachedIdentity | null> => {
  try {
    const raw = await AsyncStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCachedIdentity(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveIdentity = async (identity: CachedIdentity): Promise<void> => {
  try {
    await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // Best-effort: a failure here costs one extra RPC next launch, nothing more.
  }
};

export const clearIdentity = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(IDENTITY_KEY);
  } catch {
    // no-op
  }
};
