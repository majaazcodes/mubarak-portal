"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@/lib/types/auth";
import { fetchCurrentUser } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth-store";

// On mount, syncs the persisted user with the backend session (GET /auth/me).
// If the session is gone, axios' interceptor will trigger refresh or redirect.
export function useUser(): {
  user: User | null;
  isLoading: boolean;
  error: unknown;
} {
  const setUser = useAuthStore((s) => s.setUser);
  const cachedUser = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);

  return {
    user: query.data ?? cachedUser,
    isLoading: query.isLoading,
    error: query.error,
  };
}
