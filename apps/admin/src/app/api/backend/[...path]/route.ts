import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/config/env";
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  defaultAccessOpts,
  defaultRefreshOpts,
} from "@/lib/utils/cookies";

// Catch-all proxy: the browser never talks to the real backend directly, so
// the httpOnly cookie can be read server-side and forwarded as Authorization.
// On a 401 we try one transparent refresh + retry before propagating.

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function forward(
  req: NextRequest,
  path: string[],
  method: Method,
): Promise<NextResponse> {
  const jar = cookies();
  let accessToken = jar.get(COOKIE_ACCESS_TOKEN)?.value;
  const refreshToken = jar.get(COOKIE_REFRESH_TOKEN)?.value;

  const targetUrl =
    env.NEXT_PUBLIC_API_URL + "/" + path.join("/") + (req.nextUrl.search || "");

  const doFetch = async (token: string | undefined): Promise<Response> => {
    const headers = new Headers();
    const forwardable = ["content-type", "x-request-id", "accept"];
    for (const [k, v] of req.headers) {
      if (forwardable.includes(k.toLowerCase())) headers.set(k, v);
    }
    if (token) headers.set("authorization", `Bearer ${token}`);

    const body =
      method === "GET" || method === "DELETE"
        ? undefined
        : await req.arrayBuffer();

    return fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    });
  };

  let upstream = await doFetch(accessToken);

  if (upstream.status === 401 && refreshToken) {
    const refreshRes = await fetch(env.NEXT_PUBLIC_API_URL + "/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (refreshRes.ok) {
      const data = (await refreshRes.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };
      if (data.accessToken) {
        accessToken = data.accessToken;
        jar.set(COOKIE_ACCESS_TOKEN, data.accessToken, defaultAccessOpts());
        if (data.refreshToken) {
          jar.set(
            COOKIE_REFRESH_TOKEN,
            data.refreshToken,
            defaultRefreshOpts(false),
          );
        }
        upstream = await doFetch(accessToken);
      }
    } else {
      // Refresh failed — clear the cookies so the next nav hits the login gate.
      jar.delete(COOKIE_ACCESS_TOKEN);
      jar.delete(COOKIE_REFRESH_TOKEN);
    }
  }

  // HTTP 204/304 forbid a response body — passing even an empty ArrayBuffer
  // to NextResponse here throws "Response with null body status cannot have
  // body" in the Edge runtime. Skip the body for those statuses.
  const status = upstream.status;
  const noBody = status === 204 || status === 205 || status === 304;
  const resBody = noBody ? null : await upstream.arrayBuffer();
  const res = new NextResponse(resBody, { status });
  if (!noBody) {
    const ct = upstream.headers.get("content-type");
    if (ct) res.headers.set("content-type", ct);
  }
  const rid = upstream.headers.get("x-request-id");
  if (rid) res.headers.set("x-request-id", rid);
  return res;
}

// Narrow typing for the Next 14 App Router route handler signature.
interface Ctx {
  params: { path: string[] };
}

export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, params.path, "GET");
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, params.path, "POST");
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return forward(req, params.path, "PATCH");
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return forward(req, params.path, "PUT");
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return forward(req, params.path, "DELETE");
}
