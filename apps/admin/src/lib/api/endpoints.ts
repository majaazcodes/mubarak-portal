// Backend paths (after the /api/v1 prefix, which lives in NEXT_PUBLIC_API_URL).
// Client components hit `/api/backend/<path>` (the Next.js proxy route).
// Server Components / Server Actions call BACKEND_BASE + <path> directly.
export const AUTH = {
  login: "/auth/login",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  me: "/auth/me",
} as const;

export const PILGRIMS = {
  list: "/pilgrims",
  byId: (id: string) => `/pilgrims/${id}`,
  bulkImport: "/pilgrims/bulk-import",
} as const;

export const GROUPS = {
  list: "/groups",
  byId: (id: string) => `/groups/${id}`,
} as const;

export const QR = {
  byPilgrim: (pilgrimId: string) => `/qr/${pilgrimId}`,
  regenerate: (pilgrimId: string) => `/qr/${pilgrimId}/regenerate`,
} as const;

export const HEALTH = "/health";
