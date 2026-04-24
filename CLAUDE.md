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

## Git Commit Rules (ABSOLUTE)

1. **NEVER auto-commit without explicit user approval** — even for:
   - CI failures
   - Lint errors
   - Config fixes
   - "Production-ready" improvements
   - Proactive cleanups

2. **Workflow for all commits:**
   - Identify problem
   - Propose fix with exact scope (files, changes)
   - Show diff preview
   - WAIT for user approval
   - Then commit

3. **Atomic commits only** — no bundling unrelated changes.
   - Bad: "fix(ci): resolve pnpm + also clean lint + also refactor types"
   - Good: Three separate commits, each user-approved

4. **User owns git history.** No surprises in `git log`.

5. **If CI fails:** Stop work. Report problem. Wait for instructions.
   Do NOT attempt autonomous fixes.
