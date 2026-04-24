import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  defaultAccessOpts,
  defaultRefreshOpts,
} from "@/lib/utils/cookies";

export async function POST(): Promise<NextResponse> {
  const jar = cookies();
  const refreshToken = jar.get(COOKIE_REFRESH_TOKEN)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });
  }

  const res = await fetch(env.NEXT_PUBLIC_API_URL + "/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    jar.delete(COOKIE_ACCESS_TOKEN);
    jar.delete(COOKIE_REFRESH_TOKEN);
    return NextResponse.json({ error: "REFRESH_FAILED" }, { status: 401 });
  }

  const data = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
  };

  jar.set(COOKIE_ACCESS_TOKEN, data.accessToken, defaultAccessOpts());
  jar.set(COOKIE_REFRESH_TOKEN, data.refreshToken, defaultRefreshOpts(false));
  return NextResponse.json({ ok: true });
}
