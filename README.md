# Hajj Management Platform

Production Hajj management platform for **Mubarak Travels**. Pilot scope: 1 agency, ~1000 pilgrims, Hajj 2026.

## Structure

```
apps/
  api/            NestJS + Fastify backend API
  admin/          Next.js 14 admin web UI
  mobile/         Expo React Native operator app
packages/
  shared-types/   Shared TypeScript types (IDs, roles, statuses)
  shared-config/  Shared ESLint / Prettier / tsconfig
infra/
  docker-compose.yml   Local Postgres 16, Redis 7, Adminer
docs/
  ARCHITECTURE.md      System architecture
```

## Prerequisites

- **Node.js 20** (see `.nvmrc`)
- **pnpm 9+** — enable via `corepack enable` (Windows: run as admin once)
- **Docker Desktop** — for local Postgres / Redis / Adminer

## Quickstart

```bash
pnpm install
cp .env.example .env       # fill in secrets locally
pnpm dev:db                # start Postgres, Redis, Adminer
pnpm typecheck
pnpm lint
```

## Per-app dev

```bash
pnpm --filter api dev      # NestJS + Fastify on :4000
pnpm --filter admin dev    # Next.js on :3001
pnpm dev:mobile            # Expo + Metro in tunnel mode
```

## Mobile dev (Expo Go on a phone)

LAN access from a phone is often blocked by the laptop's firewall, so the
recommended flow uses a [cloudflared](https://github.com/cloudflare/cloudflared)
quick tunnel for the API and Expo's tunnel for Metro.

1. **Install cloudflared once** — `choco install cloudflared` (Windows, admin)
   or download a static binary from Cloudflare.
2. **Start the API** in one terminal: `pnpm dev:api` (binds to `0.0.0.0:4000`).
3. **Tunnel the API** in another terminal: `pnpm tunnel:api`. Copy the
   `https://<random>.trycloudflare.com` URL it prints.
4. **Point the mobile app at the tunnel** — paste the URL into
   `apps/mobile/.env` as `EXPO_PUBLIC_API_URL=<tunnel-url>/api/v1`.
   See `apps/mobile/.env.example` for the template.
5. **Start mobile** in a third terminal: `pnpm dev:mobile`. Scan the QR with
   Expo Go.

> Cloudflared quick-tunnel URLs change on every restart. Update the `.env`
> and reload Expo whenever you re-run `pnpm tunnel:api`.

## Root scripts

| Script            | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `pnpm dev:db`     | Start Docker services (postgres/redis/adminer) |
| `pnpm stop:db`    | Stop Docker services                           |
| `pnpm dev:api`    | Run the NestJS API in watch mode               |
| `pnpm dev:admin`  | Run the Next.js admin in dev mode              |
| `pnpm dev:mobile` | Run Expo Metro in tunnel mode (phone-friendly) |
| `pnpm tunnel:api` | Expose `http://localhost:4000` via cloudflared |
| `pnpm lint`       | Lint every workspace                           |
| `pnpm typecheck`  | Type-check every workspace                     |
| `pnpm test`       | Run tests in every workspace                   |
| `pnpm format`     | Prettier over the repo                         |

## Conventions

- TypeScript **strict** everywhere. No `any`, no `@ts-ignore`.
- Every DB query filters by `agency_id` (multi-tenant).
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) — enforced by Husky + commitlint.
- See `CLAUDE.md` for engineering rules and `docs/ARCHITECTURE.md` for system design.
