import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Key/value persistence that works on native and web.
 *
 * SecureStore has no web implementation, so the web build falls back to
 * localStorage. That is fine for what we keep here (a profile, not a secret).
 * When Supabase lands, its auth client takes over token storage and gets pointed
 * at this same adapter.
 */

const isWeb = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch {
    // A private-mode browser or a locked keychain should sign the user out,
    // not crash the app on launch.
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // Non-fatal: the session just won't survive a restart.
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // Non-fatal.
  }
}
