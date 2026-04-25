import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { login, logout } from "../api/auth";
import { useAuthStore } from "../stores/auth-store";
import type { LoginResponse } from "../types";

interface LoginInput {
  email: string;
  password: string;
}

// Translate axios errors into a stable, UI-friendly string. We only care
// about the message; the screen component handles toggling its own state.
function loginErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    if (status === 401) return "Invalid email or password";
    if (status === 429) return "Too many attempts — try again in a minute";
    if (!err.response) return "Network error — check your connection";
  }
  return "Login failed. Please try again.";
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<LoginResponse, Error, LoginInput>({
    mutationFn: login,
    onSuccess: async (data) => {
      await setSession(data.user);
    },
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const qc = useQueryClient();
  return useMutation<unknown, Error, undefined>({
    mutationFn: logout,
    onSettled: async () => {
      // Always clear local state even if the server call failed — the user
      // tapped Logout, that intent should be honoured.
      await clearSession();
      qc.clear();
    },
  });
}

export { loginErrorMessage };
