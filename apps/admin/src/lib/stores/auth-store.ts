"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/lib/types/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
}

// Only non-sensitive user info (id/email/fullName/role/agencyId) lives here.
// Tokens NEVER touch localStorage — they're in httpOnly cookies managed by
// Server Actions. This store exists so the sidebar/avatar can render from
// cache on first paint without waiting for /auth/me.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: user !== null }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "hajj-admin-user",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
