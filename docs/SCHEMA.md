# Database Schema — Hajj Management Platform (Pilot / Option A)

Source of truth: `apps/api/src/db/schema/*`. This doc is a human-readable companion; regenerate mental model from code if there is any drift.

## ERD

```
                       ┌────────────┐
                       │  agencies  │
                       └──────┬─────┘
              ┌───────────────┼───────────────┬─────────────┐
              │               │               │             │
              ▼               ▼               ▼             ▼
        ┌──────────┐     ┌──────────┐   ┌──────────┐  ┌────────────┐
        │  users   │     │  groups  │   │ pilgrims │  │ audit_logs │
        └────┬─────┘     └────┬─────┘   └────┬─────┘  └────────────┘
             │                │              │              ▲
             │   leader_user_id (SET NULL)    │              │
             └───────────────▶┘              │              │ user_id / agency_id
                                             │              │ (SET NULL)
                              ┌──────────────┼──────────┐
                              │              │          │
                              ▼              ▼          ▼
                        ┌───────────────┐ ┌────────┐ ┌────────────┐
                        │pilgrim_groups │ │qr_codes│ │ scan_logs  │
                        │ (junction)    │ │ (1:1)  │ │            │
                        └───────┬───────┘ └────────┘ └──────┬─────┘
                                │ group_id                  │ scanned_by_user_id
                                ▼                           ▼
                          ┌──────────┐                ┌──────────┐
                          │  groups  │                │  users   │
                          └──────────┘                └──────────┘
```

Tenant root is `agencies`. Every row in every other table (except super-admin `users` and system `audit_logs`) carries `agency_id` — enforced at the query layer and by FK `ON DELETE RESTRICT`.

## PostgreSQL ENUMs

| Name             | Values                                              |
| ---------------- | --------------------------------------------------- |
| `agency_plan`    | `trial`, `standard`, `enterprise`                   |
| `agency_status`  | `active`, `suspended`, `archived`                   |
| `user_role`      | `super_admin`, `agency_admin`, `operator`, `viewer` |
| `user_status`    | `active`, `disabled`                                |
| `gender`         | `male`, `female`                                    |
| `pilgrim_status` | `pending`, `active`, `completed`, `issue`           |

Adding a value requires `ALTER TYPE ... ADD VALUE` in a hand-written migration — `drizzle-kit` does not auto-generate enum mutations.

## Tables

### `agencies` — tenant root

- `id uuid PK`, `name varchar(200)`, `country char(2)`, `contact_email`, `contact_phone`, `plan` (ENUM), `status` (ENUM), `created_at`, `updated_at`
- Unique `(name, country)`, index on `status`

### `users`

- `id uuid PK`, `agency_id uuid FK→agencies` (**nullable only for `super_admin`**), `email`, `password_hash`, `role` (ENUM), `full_name`, `phone`, `status`, `last_login_at`, `created_at`, `updated_at`
- Unique `LOWER(email)` — case-insensitive email uniqueness
- Index `(agency_id, role)`
- **CHECK constraint** `users_role_agency_ck`: `(role='super_admin' AND agency_id IS NULL) OR (role<>'super_admin' AND agency_id IS NOT NULL)` — structurally prevents cross-tenant admin confusion

### `pilgrims`

- `id uuid PK`, `agency_id uuid FK→agencies`, `passport_no varchar(20)`, `national_id varchar(20)`, `full_name`, `dob date`, `gender` (ENUM), `nationality char(2)`, `photo_url text`, `emergency_contact jsonb`, `travel jsonb`, `status` (ENUM), `notes text`, `search_tsv tsvector`, `created_at`, `updated_at`, `deleted_at` (soft delete)
- `search_tsv` is `GENERATED ALWAYS AS (to_tsvector('simple', full_name || passport_no || national_id)) STORED` — automatically maintained by Postgres
- GIN index on `search_tsv` — fast full-text search
- Partial index `(agency_id, status) WHERE deleted_at IS NULL`
- Partial unique index `(agency_id, passport_no) WHERE deleted_at IS NULL` — allows re-use of passport after soft delete
- Indexes on `passport_no`, `national_id`
- JSONB shapes (documented in code):
  - `emergency_contact`: `{ name: string, phone: string, relation: string }`
  - `travel`: `{ flightNo?: string, arrivalDate?: string, hotelName?: string }`

### `groups`

- `id uuid PK`, `agency_id uuid FK→agencies`, `name`, `leader_user_id uuid FK→users ON DELETE SET NULL`, `departure_date`, `return_date`, `max_size int default 50`, `notes text`, `created_at`, `updated_at`
- Index on `agency_id`

### `pilgrim_groups` — junction (M:N)

- Composite PK `(pilgrim_id, group_id)`
- `assigned_at timestamptz`
- FKs cascade on delete from either side
- Index on `group_id` for reverse lookup

### `qr_codes` — 1:1 with `pilgrims`

- `id uuid PK`, `pilgrim_id uuid UNIQUE FK→pilgrims ON DELETE CASCADE`, `token varchar(43) UNIQUE`, `version int default 1`, `issued_at`, `revoked_at`
- `token` = base64url of 32 random bytes (43 chars, unpadded)
- Unique btree index on `token` — the hot path for mobile QR scans

### `scan_logs` — append-only audit of QR scans

- `id bigserial PK`, `agency_id FK`, `pilgrim_id FK`, `scanned_by_user_id FK`, `qr_token varchar(43)`, `scanned_at timestamptz`, `lat`, `lng`, `device_id`, `was_offline boolean`, `synced_at timestamptz`
- Indexes: `(pilgrim_id, scanned_at DESC)`, `(agency_id, scanned_at DESC)`, `(scanned_by_user_id, scanned_at DESC)`

### `audit_logs` — every mutation

- `id bigserial PK`, `agency_id` (nullable, system actions), `user_id` (nullable, system actions), `action varchar(50)`, `entity_type varchar(50)`, `entity_id uuid`, `before jsonb`, `after jsonb`, `ip varchar(45)`, `user_agent text`, `created_at`
- Indexes: `(agency_id, created_at DESC)`, `(entity_type, entity_id)`, `(user_id, created_at DESC)`

## Multi-tenancy invariant

Every query outside the `super_admin` surface must filter by `agency_id`. This is enforced at four layers:

1. **JWT** carries `agencyId`, pinned to request context
2. **Repository signature** — every method requires `agencyId`
3. **Database CHECK + FK RESTRICT** — cross-tenant writes fail at the DB
4. **Audit log** — every mutation row carries `agency_id`

## Migration workflow

```
pnpm db:generate   # write SQL from schema/*.ts
pnpm db:migrate    # apply pending migrations
pnpm db:seed       # idempotent: seeds pilot data only if empty
pnpm db:reset      # dev only — drops public + drizzle schemas, re-migrates, re-seeds
pnpm db:studio     # browser UI on https://local.drizzle.studio
```

## Seed data (`pnpm db:seed`)

Deterministic (`faker.seed(42)`):

- 1 super admin (`admin@hajj-platform.com` / `Admin@123`)
- 1 agency (`Mubarak Travels`, IN, standard plan)
- 1 agency admin (`admin@mubarak.com` / `Mubarak@123`)
- 3 operators (`staff1..3@mubarak.com` / `Staff@123`)
- 5 groups (A–E, Indian departure cities, 2026-05-25 through 2026-05-29)
- 1000 pilgrims (200 per group, 50/50 gender, age 40–75, Indian Muslim name pools, Aadhaar-format national IDs, Makkah hotel assignments)
- 1000 QR codes (1:1 with pilgrims, base64url 43-char tokens)
- 1000 `pilgrim_groups` assignments
- 1 initial `audit_logs` row

Runtime: ~2 seconds on dev hardware.
