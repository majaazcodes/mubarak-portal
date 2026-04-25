import { create } from "zustand";
import { secureStorage } from "../utils/secure-storage";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  // `isHydrated` lets the root layout block routing until secure-store has
  // been read — without this, every cold start flashes the login screen for
  // a frame before redirecting to the tabs.
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (user: User) => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,
  hydrate: async () => {
    try {
      const raw = await secureStorage.getItem("user");
      if (raw) {
        const user = JSON.parse(raw) as User;
        set({ user, isHydrated: true });
        return;
      }
    } catch {
      // Corrupt JSON in secure-store — treat as logged out, don't crash.
    }
    set({ user: null, isHydrated: true });
  },
  setSession: async (user) => {
    await secureStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
  clearSession: async () => {
    await secureStorage.clearAuth();
    set({ user: null });
  },
}));
