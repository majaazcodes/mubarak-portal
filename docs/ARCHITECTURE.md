# Hajj Management Platform — Architecture

> **Status**: initial draft synthesized from `CLAUDE.md` + the foundation task spec. Refine after product review.

## Mission

Run the end-to-end Hajj operation for **Mubarak Travels** — pilot scope **1 agency, ~1000 pilgrims, Hajj 2026** — with three user-facing surfaces sharing a single backend and data model.

Mission-critical: real pilgrims depend on this during a multi-week pilgrimage across Makkah and Madinah. Downtime or data loss has operational consequences on the ground, not just business consequences.

## System Overview

```
                 ┌───────────────┐       ┌───────────────┐
                 │  admin (web)  │       │ mobile (ops)  │
                 │  Next.js 14   │       │ Expo + WDB    │
                 └───────┬───────┘       └───────┬───────┘
                         │ HTTPS (JWT)            │ HTTPS + sync endpoints
                         ▼                        ▼
                 ┌──────────────────────────────────────┐
                 │              api (NestJS + Fastify)  │
                 │  auth · pilgrims · bookings · flights │
                 │  audit · sync · jobs                 │
                 └────┬──────────────┬─────────────┬─────┘
                      │              │             │
                 ┌────▼─────┐   ┌────▼────┐   ┌────▼────┐
                 │ Postgres │   │  Redis  │   │   R2    │
                 │   16     │   │  7 + AOF│   │ objects │
                 │ (Drizzle)│   │(BullMQ) │   │         │
                 └──────────┘   └─────────┘   └─────────┘
```

- **api**: single NestJS service with Fastify adapter. All state-changing calls go through audit log middleware.
- **admin**: Next.js 14 (app router) — agency admins, operators, viewers.
- **mobile**: Expo React Native — on-the-ground operators, offline-first via WatermelonDB.
- **shared-types**: source-consumed package that defines branded IDs and enums used on all three surfaces.

## Tech Stack Rationale (LOCKED per CLAUDE.md)

| Layer             | Choice                             | Why                                                                                          |
| ----------------- | ---------------------------------- | -------------------------------------------------------------------------------------------- |
| Backend framework | NestJS + Fastify                   | Modular, DI-first, decorator validation; Fastify for throughput & schema-based routing.      |
| DB                | Postgres 16                        | Mature, multi-tenant patterns (`agency_id` filter), strong constraints, JSONB where useful.  |
| ORM               | Drizzle                            | Type-safe, no magic, plays well with strict TS; trivial migrations via drizzle-kit.          |
| Cache/queues      | Redis 7 + BullMQ                   | Industry standard; AOF persistence for durability of queued jobs.                            |
| Admin UI          | Next.js 14 + Tailwind + shadcn/ui  | Server components, strong SSR story, composable UI kit.                                      |
| Mobile            | Expo + React Native + WatermelonDB | Expo removes native-build toil; WatermelonDB gives us the only credible offline-first RN DB. |
| Auth              | Self-hosted JWT + Argon2id         | No vendor lock-in; Argon2id resists GPU cracking.                                            |
| Object storage    | Cloudflare R2                      | S3-compatible, zero egress cost, good DX.                                                    |
| Observability     | Sentry                             | Both server + mobile + web sources unified.                                                  |
| Monorepo          | pnpm workspaces                    | Symlink hoisting, deterministic installs; simpler than Nx/Turbo for this scope.              |

**Explicitly rejected**: MongoDB, Firebase, Express, Prisma.

## Data Model (foundation sketch)

Full schema lives in `apps/api/src/db/schema/`. For now, the invariants:

- Every row belongs to an **agency** (`agency_id FK, NOT NULL`). No orphaned data.
- **Multi-tenant enforcement** happens at the query layer — every repository method accepts (or derives) `agencyId` and filters on it. This is an invariant verified by tests and audit logs, not a convention.
- Primary entities (pilot scope):
  - `agencies` — tenant root
  - `users` — agency staff; role ∈ `super_admin | agency_admin | operator | viewer`
  - `pilgrims` — agency's customers; status ∈ `registered | visa_pending | visa_approved | traveled | in_makkah | in_madinah | completed | cancelled`
  - `bookings`, `flights`, `rooms`, `groups` — operational entities (schema TBD)
  - `audit_logs` — every mutation, indexed by agency + actor + timestamp

## Multi-tenancy Enforcement

Defense in depth, not a single gate:

1. **JWT**: carries `userId` + `agencyId` + `role`. `agencyId` is the tenant boundary.
2. **Request guard**: every controller requires a valid JWT; `agencyId` is pinned to the request context.
3. **Repository**: every query method signature **requires** `agencyId`. There is no "get by id" without it.
4. **Database**: `agency_id` is a composite part of most unique constraints. Cross-tenant collisions are structurally impossible.
5. **Audit**: every mutation writes an audit row with `agency_id`. Anomalies are visible.

## Auth Flow

- **Registration**: admin-initiated only. Passwords hashed with Argon2id (m=19456, t=2, p=1 tuned for <100ms on target hardware).
- **Login**: email + password → short-lived access JWT (15 min) + refresh token (rotating, DB-backed, 30 days).
- **Refresh**: rotating refresh tokens; reuse detection triggers token family revocation.
- **Mobile offline**: access token cached; refresh happens on reconnect.

## Offline-first Mobile

The field reality: Mina/Arafat has terrible connectivity. The mobile app **must** work offline.

- Local state: **WatermelonDB** on SQLite. All reads hit local DB.
- Writes: queued locally, synced opportunistically.
- Sync protocol: pull-based diff endpoints per entity (`/sync/pilgrims?since=<ts>`), plus a push endpoint for queued changes. Conflict resolution: last-write-wins on non-critical fields; server-authoritative for status transitions.
- QR scan response target: **<2s end-to-end** — local DB lookup, no network round-trip on the hot path.

## Background Jobs (BullMQ)

- Queues: `notifications` (SMS/email), `sync-retries`, `reports`, `audit-rollup`.
- All jobs are idempotent and carry `agency_id`.
- Dead-letter queue with manual retry from admin UI.

## Observability

- **Sentry** — errors from api, admin, mobile. Scoped by `agencyId` tag.
- **Audit logs** — DB-resident source of truth for "who did what, when".
- **Structured logs** — pino (Fastify default), JSON to stdout, shipped downstream.
- **No PII in logs** — tokens, passwords, passport numbers never logged. Enforced via redaction config + code review.

## Deployment Topology (intended)

- `api`: Fly.io or Render, horizontally scalable, behind a managed Postgres + Redis.
- `admin`: Vercel (Next.js native) or same PaaS as api.
- `mobile`: Expo EAS Build, distributed via internal testing during pilot.
- Postgres: managed (Neon or RDS), WAL archiving + PITR.
- Secrets: platform-native secret stores. `.env` is local-only.

## Security Boundaries

- TLS everywhere (managed by PaaS).
- No secrets in git. `.env.example` has placeholders only.
- CORS: admin origin allowlist only.
- Rate limits: per-IP and per-user at the api edge.
- Input validation: every endpoint has a DTO (class-validator or Zod) — no raw body parsing.
- Dependency hygiene: `pnpm audit` in CI, Dependabot enabled.

## Open Questions / Deferred Decisions

- Final hosting provider.
- Notification channels (SMS provider, email provider).
- Backup cadence and PITR window.
- Pilot UAT acceptance criteria.

> Edit this file as decisions land. Each PR that changes architecture should update the relevant section.
