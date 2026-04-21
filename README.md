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
pnpm --filter api dev      # NestJS + Fastify on :3000
pnpm --filter admin dev    # Next.js on :3001
pnpm --filter mobile start # Expo dev server
```

## Root scripts

| Script           | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| `pnpm dev:db`    | Start Docker services (postgres/redis/adminer) |
| `pnpm stop:db`   | Stop Docker services                           |
| `pnpm lint`      | Lint every workspace                           |
| `pnpm typecheck` | Type-check every workspace                     |
| `pnpm test`      | Run tests in every workspace                   |
| `pnpm format`    | Prettier over the repo                         |

## Conventions

- TypeScript **strict** everywhere. No `any`, no `@ts-ignore`.
- Every DB query filters by `agency_id` (multi-tenant).
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) — enforced by Husky + commitlint.
- See `CLAUDE.md` for engineering rules and `docs/ARCHITECTURE.md` for system design.
