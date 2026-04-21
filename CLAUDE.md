# Hajj Management Platform — Claude Instructions

## Project Context

Production Hajj management platform for Mubarak Travels.
Pilot: 1000 pilgrims, Hajj 2026 (5 weeks from now).
Mission-critical: real pilgrims depend on this.

## Tech Stack (LOCKED — do not deviate)

- Backend: NestJS + Fastify + TypeScript strict
- DB: PostgreSQL 16 + Drizzle ORM
- Cache: Redis + BullMQ
- Admin: Next.js 14 + Tailwind + shadcn/ui
- Mobile: React Native + Expo + WatermelonDB
- Auth: Self-hosted JWT + Argon2id
- Monorepo: pnpm workspaces

## Rules

- TypeScript strict mode. No `any`. No `@ts-ignore`.
- Every DB query must filter by agency_id (multi-tenant).
- Never log passwords, tokens, or PII.
- All endpoints must have Zod/class-validator DTOs.
- Every mutation goes through audit log.
- Offline-first for mobile — assume network WILL fail.
- Write tests for every new module.

## Do NOT

- Use MongoDB, Firebase, Express, or Prisma (we evaluated and rejected).
- Install packages without justification.
- Skip tests.
- Use `any` type.
- Hardcode secrets.
- Deviate from the architecture in ARCHITECTURE.md.

## When stuck

Ask the user before making architectural decisions.
