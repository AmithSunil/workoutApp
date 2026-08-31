import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * The Supabase client — the app's single door to the backend.
 *
 * Both values come from `.env.local` (see `.env.example`). `EXPO_PUBLIC_*` vars
 * are inlined into the bundle at build time, so the key here must always be the
 * publishable/anon key and every table must be protected by row level security.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY. ' +
      'Copy .env.example to .env.local and restart the dev server — Expo only ' +
      'reads env files at startup.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    /**
     * Native has no `localStorage`, so sessions persist through AsyncStorage.
     * On web we leave `storage` undefined and let supabase-js pick its own
     * default, which stays inert during the static prerender pass where no
     * `window` exists.
     */
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    /** Deep links are handled by expo-router, not by the client. */
    detectSessionInUrl: false,
  },
});
