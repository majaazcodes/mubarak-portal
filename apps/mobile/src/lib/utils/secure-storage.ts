import * as SecureStore from "expo-secure-store";

// expo-secure-store keys must be alphanumeric/underscore/dot/dash. Centralising
// them here avoids typos and makes it obvious which secrets the app stores.
const KEYS = {
  accessToken: "mubarak.accessToken",
  refreshToken: "mubarak.refreshToken",
  user: "mubarak.user",
} as const;

export type SecureKey = keyof typeof KEYS;

export const secureStorage = {
  async setItem(key: SecureKey, value: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS[key], value);
  },
  async getItem(key: SecureKey): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS[key]);
  },
  async removeItem(key: SecureKey): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS[key]);
  },
  async clearAuth(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.accessToken),
      SecureStore.deleteItemAsync(KEYS.refreshToken),
      SecureStore.deleteItemAsync(KEYS.user),
    ]);
  },
};
