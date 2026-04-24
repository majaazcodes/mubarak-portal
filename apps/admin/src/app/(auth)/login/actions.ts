"use server";

import { cookies } from "next/headers";
import { env } from "@/lib/config/env";
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  defaultAccessOpts,
  defaultRefreshOpts,
} from "@/lib/utils/cookies";
import type { LoginResponse, User } from "@/lib/types/auth";

export interface LoginResult {
  ok: boolean;
  user?: User;
  error?: string;
  retryAfterSeconds?: number;
}

export async function loginAction(input: {
  email: string;
  password: string;
  remember: boolean;
}): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch(env.NEXT_PUBLIC_API_URL + "/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "API unavailable — check your connection." };
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after") ?? "60");
    return {
      ok: false,
      error: `Too many attempts. Try again in ${Number.isFinite(retryAfter) ? retryAfter : 60}s.`,
      retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : 60,
    };
  }

  if (!res.ok) {
    let message = "Invalid credentials";
    try {
      const data = (await res.json()) as { message?: string };
      if (typeof data.message === "string" && data.message.length > 0) {
        message = data.message;
      }
    } catch {
      // fall through with default message
    }
    return { ok: false, error: message };
  }

  const data = (await res.json()) as LoginResponse;
  const jar = cookies();
  jar.set(COOKIE_ACCESS_TOKEN, data.accessToken, defaultAccessOpts());
  jar.set(
    COOKIE_REFRESH_TOKEN,
    data.refreshToken,
    defaultRefreshOpts(input.remember),
  );
  return { ok: true, user: data.user };
}

export async function logoutAction(): Promise<void> {
  const jar = cookies();
  const refreshToken = jar.get(COOKIE_REFRESH_TOKEN)?.value;
  if (refreshToken) {
    try {
      await fetch(env.NEXT_PUBLIC_API_URL + "/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore — we still want to clear local cookies on logout.
    }
  }
  jar.delete(COOKIE_ACCESS_TOKEN);
  jar.delete(COOKIE_REFRESH_TOKEN);
}
