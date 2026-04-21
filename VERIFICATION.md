# Verification

Results of the 8 foundation tests. Run on **2026-04-21**.

## Prerequisites (dev machine at time of run)

- [x] Node.js installed — `v24.14.1` (spec says 20, see note below)
- [ ] pnpm on PATH — **not installed globally**; workaround via `corepack pnpm <cmd>` (corepack 0.34.6 available)
- [ ] Docker Desktop — **not installed**
- [x] Git — `2.53.0.windows.2`

> **Note on pnpm**: `corepack enable pnpm` failed with `EPERM` (needs admin on Windows). Workaround used for this verification run: `corepack pnpm …`. The `packageManager: "pnpm@9.15.0"` field in root `package.json` pins the version. Fix on your side: run `corepack enable` from an admin PowerShell once, or `npm i -g pnpm`.
> **Note on Node**: spec asks for Node 20 (`.nvmrc` pins this). Local machine has 24. Tests passed on 24; CI matrix still targets 20.

---

## Test 1 — Install dependencies ✅

```bash
pnpm install
```

- [x] No errors — resolved 1409 packages, added 1449 in **1m 53s**
- [x] `node_modules/` created at root + per-workspace
- [x] Husky hooks installed by the `prepare: "husky"` script (`core.hooksPath = .husky/_`)

---

## Test 2 — TypeScript compiles ✅

```bash
pnpm -r typecheck
```

- [x] Zero errors in all 5 workspaces (shared-config, shared-types, api, admin, mobile)

---

## Test 3 — Lint passes ✅

```bash
pnpm -r lint
```

- [x] Zero errors in all 5 workspaces

**Fixes applied during verification**:

- Added `packages/shared-config/eslint.config.js` re-exporting the preset (ESLint 9 needs an actual config file to be present for the package to lint itself).
- Removed deprecated `--ext` flag from mobile's lint script (ESLint 9 flat config handles file patterns internally).
- Fixed `apps/api/src/main.ts`: made `NestFastifyApplication` a type-only import (`consistent-type-imports`) and removed an unused `eslint-disable` directive.
- Renamed `apps/*/eslint.config.js` → `.mjs` to eliminate `MODULE_TYPELESS_PACKAGE_JSON` perf warnings without forcing `"type": "module"` on apps (which would break NestJS CommonJS runtime).

---

## Test 4 — Docker services boot ❌

```bash
pnpm dev:db
```

- [ ] **Blocked**: Docker Desktop is not installed on this machine.

```
> docker compose -f infra/docker-compose.yml up -d
'docker' is not recognized as an internal or external command
```

**Next step (you)**: install Docker Desktop for Windows, restart, then re-run `pnpm dev:db`. The compose file (`infra/docker-compose.yml`) is in place and uses named volumes (`postgres-data`, `redis-data`), health checks, and container names `hajj-postgres` / `hajj-redis` / `hajj-adminer`.

---

## Test 5 — PostgreSQL reachable ❌

- [ ] **Blocked by Test 4**. After Docker is installed and services are up, run:

```bash
docker exec -it hajj-postgres psql -U hajj -d hajj_dev -c "SELECT version();"
```

---

## Test 6 — Redis reachable ❌

- [ ] **Blocked by Test 4**. After Docker is installed and services are up, run:

```bash
docker exec -it hajj-redis redis-cli ping
```

---

## Test 7 — Adminer UI ❌

- [ ] **Blocked by Test 4**. After `pnpm dev:db` succeeds, open <http://localhost:8080>.

---

## Test 8 — Git hooks ✅ (verified without committing)

Husky hooks are wired (`core.hooksPath = .husky/_`). Rather than create an initial commit without explicit approval, commitlint was exercised directly:

```bash
# Rejects non-conventional message
$ echo "bad message" | pnpm exec commitlint
✖ subject may not be empty [subject-empty]
✖ type may not be empty [type-empty]
✖ found 2 problems, 0 warnings           # exit 1

# Accepts conventional message
$ echo "chore: initial monorepo setup" | pnpm exec commitlint
# exit 0, no output
```

- [x] commitlint rejects `bad message` (exit 1)
- [x] commitlint accepts `chore: initial monorepo setup` (exit 0)
- [x] `.husky/pre-commit` runs `pnpm exec lint-staged`
- [x] `.husky/commit-msg` runs `pnpm exec commitlint --edit "$1"`
- [ ] End-to-end `git commit` test — not executed; needs your go-ahead (would create the first commit on the repo).

---

## Summary

| #   | Test                        | Status                                   |
| --- | --------------------------- | ---------------------------------------- |
| 1   | `pnpm install`              | ✅                                       |
| 2   | `pnpm typecheck`            | ✅                                       |
| 3   | `pnpm lint`                 | ✅                                       |
| 4   | `pnpm dev:db` + `docker ps` | ❌ Docker not installed                  |
| 5   | Postgres `SELECT version()` | ❌ blocked by 4                          |
| 6   | Redis `ping`                | ❌ blocked by 4                          |
| 7   | Adminer UI on :8080         | ❌ blocked by 4                          |
| 8   | commitlint reject/accept    | ✅ (logic verified; e2e commit deferred) |

## Deviations from spec

- **pnpm access pattern**: used `corepack pnpm <cmd>` because pnpm isn't on PATH on this machine and `corepack enable` requires admin. The generated files are correct for a standard setup — once you have pnpm globally, `pnpm install` / `pnpm lint` etc. work as specified.
- **ESLint config file suffix**: apps use `eslint.config.mjs` (not `.js` per spec). This avoids the Node module-type warning without forcing `"type": "module"` on NestJS (which must stay CommonJS). Functionally identical.
- **`packages/shared-config/eslint.config.js`** was added as a thin re-export of the `eslint.js` preset, so the package can lint itself. Not in the original spec but required for ESLint 9.
