# @hajj/admin — Mubarak Travels Admin Portal

Next.js 14 (App Router) admin shell for the Hajj Management Platform. Agency
admins and operators sign in here to manage pilgrims, groups, and imports.

## Run it

```bash
# 1. start infra (postgres + redis) and the API — in a separate terminal:
pnpm dev:db
pnpm dev:api

# 2. start the admin
pnpm dev:admin
# → http://localhost:3001
```

Seeded credentials: `admin@mubarak.com` / `Mubarak@123`.

## Architecture

Why the structure looks the way it does:

- **httpOnly cookies for tokens.** Access + refresh live in `Secure; HttpOnly`
  cookies. They are never readable by client JS, which keeps tokens safe from
  XSS. Cookie lifetime: access 15m, refresh 7d (or 30d if "remember me").
- **Server Actions for mutations.** Login / logout run in
  [`src/app/(auth)/login/actions.ts`](<./src/app/(auth)/login/actions.ts>) —
  they hit the backend server-side and set/clear the cookies.
- **Proxy route for client reads.** Anything the client fetches via axios
  goes through [`src/app/api/backend/[...path]/route.ts`](./src/app/api/backend/%5B...path%5D/route.ts),
  which reads the httpOnly cookie server-side and forwards with `Authorization:
Bearer …`. The browser only ever sees `/api/backend/...` URLs. axios
  `baseURL` is `/api/backend`.
- **Refresh on 401.** Axios' response interceptor hits
  `/api/auth/refresh` (route handler) on a 401, retries once, and redirects
  to `/login?from=…` if refresh itself fails. Concurrent 401s share one
  refresh promise.
- **Middleware auth gate.** [`src/middleware.ts`](./src/middleware.ts)
  blocks unauthenticated access to `/dashboard`, `/pilgrims`, `/groups`,
  `/settings` by checking the refresh cookie — server-side, before the page
  renders. Client-side `useUser()` is the belt-and-suspenders pass.
- **Env is Zod-validated at boot.** [`src/lib/config/env.ts`](./src/lib/config/env.ts)
  throws with a clear message if `NEXT_PUBLIC_API_URL` is missing or malformed,
  so broken config fails the build, not a request.

## Layout

```
src/
├─ app/
│  ├─ layout.tsx              root — QueryProvider + ToastProvider
│  ├─ page.tsx                redirect based on cookie
│  ├─ loading.tsx / error.tsx / not-found.tsx
│  ├─ (auth)/login/           login page + Server Action
│  ├─ (dashboard)/            sidebar+header layout + pages
│  └─ api/
│     ├─ auth/refresh/route.ts    refresh helper
│     └─ backend/[...path]/route.ts   catch-all proxy
├─ components/
│  ├─ ui/                shadcn primitives (Slate + New York)
│  ├─ layout/            sidebar, header, mobile-nav, user-menu
│  ├─ auth/              login-form, logout-button
│  └─ providers/         query-provider, toast-provider
├─ lib/
│  ├─ api/               axios client + endpoints
│  ├─ stores/auth-store.ts    Zustand (user info only, NOT tokens)
│  ├─ hooks/             use-auth, use-user
│  ├─ utils/             cn, cookies, logger
│  ├─ types/auth.ts      re-exports from @hajj/shared-types
│  └─ config/            env, nav
└─ middleware.ts
```

## What's NOT here (deferred)

- Pilgrim list / search UI — backend ready; page is a placeholder.
- Bulk CSV/XLSX import UI — backend ready (`POST /pilgrims/bulk-import`).
- Group management UI.
- Playwright / visual regression tests.
- Dark mode toggle.
