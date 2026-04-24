// Shared cookie names used by both Server Actions (httpOnly writes) and the
// middleware/proxy route (reads). Keep names in one place so a rename can't
// silently break the auth flow.
export const COOKIE_ACCESS_TOKEN = "accessToken";
export const COOKIE_REFRESH_TOKEN = "refreshToken";

export const DEFAULT_ACCESS_MAX_AGE_SEC = 15 * 60; // 15 min
export const DEFAULT_REFRESH_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7 days
export const REMEMBER_REFRESH_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days

export interface CookieOpts {
  maxAge: number;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
}

export function defaultAccessOpts(): CookieOpts {
  return {
    maxAge: DEFAULT_ACCESS_MAX_AGE_SEC,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  };
}

export function defaultRefreshOpts(remember: boolean): CookieOpts {
  return {
    maxAge: remember
      ? REMEMBER_REFRESH_MAX_AGE_SEC
      : DEFAULT_REFRESH_MAX_AGE_SEC,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  };
}
