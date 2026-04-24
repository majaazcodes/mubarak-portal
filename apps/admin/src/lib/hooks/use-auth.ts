"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth-store";
import { logoutAction } from "@/app/(auth)/login/actions";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();

  const logout = useCallback(async () => {
    await logoutAction();
    clearAuth();
    toast.success("Logged out successfully");
    router.replace("/login");
    router.refresh();
  }, [clearAuth, router]);

  return { user, isAuthenticated, logout };
}
