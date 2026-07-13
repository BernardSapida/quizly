import * as SecureStore from 'expo-secure-store';
import logger from '@/lib/logger';

// Access level guide:
//   TOKEN_KEY            → requireAuthentication: false  (must be readable silently on resume)
//   REFRESH_TOKEN_KEY    → requireAuthentication: false  (same reason)
//   TOKEN_EXPIRY_KEY     → requireAuthentication: false  (non-sensitive, just a timestamp)
//   High-sensitivity keys (e.g. private key, full card number)
//                        → requireAuthentication: true   (requires biometric or device PIN)
//
// Note: requireAuthentication: true throws on devices with no screen lock configured.
// Callers must handle that error gracefully.

export const TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';
export const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

// App-lock PIN. We store only a salted SHA-256 hash, never the raw digits.
export const PIN_HASH_KEY = 'app_lock_pin_hash';
export const PIN_SALT_KEY = 'app_lock_pin_salt';
// Failed-unlock counter — persisted so relaunching can't reset the lockout.
export const PIN_ATTEMPTS_KEY = 'app_lock_pin_attempts';

type GetOptions = { requireAuthentication?: boolean };
type SetOptions = { requireAuthentication?: boolean };

export const secureStore = {
  async get(key: string, options?: GetOptions): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key, {
        requireAuthentication: options?.requireAuthentication ?? false,
      });
    } catch (error) {
      logger.error('SecureStore.get failed', { key, error });
      return null;
    }
  },

  async set(key: string, value: string, options?: SetOptions): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        requireAuthentication: options?.requireAuthentication ?? false,
      });
    } catch (error) {
      logger.error('SecureStore.set failed', { key, error });
    }
  },

  async delete(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.error('SecureStore.delete failed', { key, error });
    }
  },
};

/** Zustand-compatible storage adapter backed by expo-secure-store */
export const zustandSecureStorage = {
  getItem: (name: string) => secureStore.get(name),
  setItem: (name: string, value: string) => secureStore.set(name, value),
  removeItem: (name: string) => secureStore.delete(name),
};

export function getTokenExpiry(token: string): number {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return Date.now() + 3_600_000;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload.exp ? payload.exp * 1000 : Date.now() + 3_600_000;
  } catch {
    return Date.now() + 3_600_000;
  }
}

export function isTokenExpired(expiryMs: number): boolean {
  return Date.now() >= expiryMs - 30_000;
}

export async function storeTokens(token: string, refreshToken?: string): Promise<void> {
  const expiry = getTokenExpiry(token);
  await secureStore.set(TOKEN_KEY, token);
  await secureStore.set(TOKEN_EXPIRY_KEY, String(expiry));
  if (refreshToken) {
    await secureStore.set(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    secureStore.delete(TOKEN_KEY),
    secureStore.delete(REFRESH_TOKEN_KEY),
    secureStore.delete(TOKEN_EXPIRY_KEY),
  ]);
}
