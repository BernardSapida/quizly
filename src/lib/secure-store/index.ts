import * as SecureStore from 'expo-secure-store';
import logger from '@/lib/logger';

type GetOptions = { requireAuthentication?: boolean };
type SetOptions = { requireAuthentication?: boolean };

// Note: requireAuthentication: true throws on devices with no screen lock
// configured. Callers must handle that error gracefully.
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
