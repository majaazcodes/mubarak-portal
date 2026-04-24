// Backend paths (after the /api/v1 prefix, which lives in NEXT_PUBLIC_API_URL).
// Client components hit `/api/backend/<path>` (the Next.js proxy route).
// Server Components / Server Actions call BACKEND_BASE + <path> directly.
export const AUTH = {
  login: "/auth/login",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  me: "/auth/me",
} as const;

export const HEALTH = "/health";
