import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_REFRESH_TOKEN } from "@/lib/utils/cookies";

// Paths under (dashboard) that require auth. We list the segments here rather
// than matching the (dashboard) group name because route-group parens don't
// show up in the URL path — they're a source-layout convention only.
const PROTECTED_PREFIXES = ["/dashboard", "/pilgrims", "/groups", "/settings"];

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(COOKIE_REFRESH_TOKEN)?.value);

  // Already signed in? skip the login page — send to dashboard.
  if (pathname === "/login" && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip internals, static assets, and the API routes (those handle their own
  // auth via the cookie server-side).
  matcher: [
    "/((?!_next/static|_next/image|api|favicon.ico|robots.txt|.*\\..*).*)",
  ],
};
