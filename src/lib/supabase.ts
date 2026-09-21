import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * The Supabase client, or null when the app has not been pointed at a project.
 *
 * Both values are safe to ship in the bundle. The anon key is designed to be
 * public: it identifies the project, it does not grant anything. What a holder
 * of it can actually read and write is decided entirely by the row-level
 * security policies in supabase/schema.sql. That is why the school scoping and
 * the contact gate live there and not in this app.
 *
 * Null rather than throwing, so a checkout with no .env still runs: the app
 * falls back to its on-device seed data and says so, instead of a white screen.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // Web has localStorage and the default adapter handles it. Native has
        // neither, so hand it AsyncStorage. SecureStore would be the better
        // home for a token, but it warns past 2KB and Supabase sessions run
        // longer than that.
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // There is no URL to parse a session out of outside the browser.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

/** Narrowing helper so callers do not repeat the null check. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}
