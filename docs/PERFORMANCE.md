# Performance Validation — QR Hot Path

Run date: 2026-04-24
Database: `hajj_dev` with 1000 pilgrims + 1000 QR codes seeded
Platform: Windows 11 + Docker Desktop, Postgres 16-alpine, Redis 7-alpine, local loopback

## Budget

| Metric      | Target      | Actual    | Status |
| ----------- | ----------- | --------- | ------ |
| p95 latency | < 500 ms    | 325 ms    | PASS   |
| Error rate  | < 0.1%      | 0.000%    | PASS   |
| Throughput  | > 200 req/s | 413 req/s | PASS   |

## 1. `EXPLAIN ANALYZE` — QR token lookup (hot path)

```sql
SELECT q.id, q.token, q.version, q.revoked_at,
       p.id, p.agency_id, p.full_name, p.passport_no, p.nationality,
       p.gender, p.status, p.photo_url, p.emergency_contact, p.deleted_at,
       (SELECT g.name FROM pilgrim_groups pg
          JOIN groups g ON g.id = pg.group_id
         WHERE pg.pilgrim_id = p.id
         ORDER BY pg.assigned_at ASC LIMIT 1) AS group_name
  FROM qr_codes q
  JOIN pilgrims p ON p.id = q.pilgrim_id
 WHERE q.token = $1
 LIMIT 1;
```

**Plan (cold, first call):**

```
Nested Loop  (cost=0.55..33.14 rows=1) (actual time=6.824..6.827 rows=1)
  ->  Index Scan using uq_qr_codes_token on qr_codes q   (actual 3.511 ms)
  ->  Index Scan using pilgrims_pkey on pilgrims p       (actual 0.119 ms)
  SubPlan 1 (group_name)
     Limit ... Sort ... Nested Loop
        ->  Index Scan using pilgrim_groups_pilgrim_id_group_id_pk on pilgrim_groups pg
        ->  Index Scan using groups_pkey on groups g
Planning Time: 23.091 ms
Execution Time: 7.261 ms
```

Verdict — all index scans, no sequential scans. 7.2ms cold. Repeated runs
after the prepare-statement cache warms drop to sub-millisecond.

## 2. `EXPLAIN ANALYZE` — pilgrim list + full-text search

```sql
SELECT id, full_name, passport_no, nationality, gender, status, created_at
  FROM pilgrims
 WHERE agency_id = $1
   AND deleted_at IS NULL
   AND search_tsv @@ to_tsquery('simple', 'mohammed:*')
 ORDER BY created_at DESC
 LIMIT 20;
```

**Plan:**

```
Limit  (cost=47.76..47.79 rows=11) (actual time=6.694..6.699 rows=11)
  ->  Sort (Sort Method: quicksort, Memory: 26kB)
        ->  Bitmap Heap Scan on pilgrims  (actual 6.456..6.507 ms, rows=11)
              Recheck Cond: (search_tsv @@ '''mohammed'':*'::tsquery)
              Filter: ((deleted_at IS NULL) AND (agency_id = $1))
              ->  Bitmap Index Scan on ix_pilgrims_search_tsv  (actual 6.398..6.399 ms)
Planning Time: 17.305 ms
Execution Time: 7.215 ms
```

Verdict — GIN index `ix_pilgrims_search_tsv` is used via Bitmap Index Scan.
Agency + deleted_at filter applied in the Recheck. 7.2ms for a prefix search
over 1000 rows, scaling linearly to match indexes.

## 3. `EXPLAIN ANALYZE` — pilgrim list filtered by group

```sql
SELECT p.id, p.full_name, p.passport_no, p.gender, p.status, p.created_at
  FROM pilgrims p
  INNER JOIN pilgrim_groups pg ON pg.pilgrim_id = p.id
 WHERE p.agency_id = $1
   AND pg.group_id = $2
   AND p.deleted_at IS NULL
 ORDER BY p.created_at DESC
 LIMIT 20;
```

**Plan:**

```
Limit  (Sort Method: top-N heapsort, Memory: 27kB)
  ->  Hash Join
        Hash Cond: (p.id = pg.pilgrim_id)
        ->  Seq Scan on pilgrims p  (actual 0.009..0.273 ms, rows=1000)
              Filter: ((deleted_at IS NULL) AND (agency_id = $1))
        ->  Hash
              ->  Bitmap Heap Scan on pilgrim_groups pg (actual 3.818..3.840 ms, rows=200)
                    Recheck Cond: (group_id = $2)
                    ->  Bitmap Index Scan on ix_pilgrim_groups_group  (actual 3.802..3.803 ms)
Planning Time: 9.427 ms
Execution Time: 5.577 ms
```

Verdict — total 5.6ms. The Seq Scan on pilgrims is _internal to the Hash
Join_, not the top-level node (top node is Limit). With only 1000 rows the
planner correctly chose sequential over index scan — scanning 1000 rows is
cheaper than index traversal for a table this small. At 10k+ rows Postgres
will auto-switch to `ix_pilgrims_agency_status` (partial index on
agency + status WHERE deleted_at IS NULL). No action required for pilot scale.

## 4. autocannon load test — `POST /api/v1/qr/lookup`

Command: `pnpm --filter api exec tsx test/load/qr-lookup.autocannon.ts`
Config: 100 concurrent connections, 60s measurement, 10s warmup, 20 real
QR tokens rotated across 500 simulated devices.

```
=== RESULTS ===
Requests/sec:   413
Latency p50:    235.0 ms
Latency p95:    325.0 ms
Latency p99:    371.0 ms
Latency max:    621.0 ms
Errors:         0
Timeouts:       0
Non-2xx:        0
Total requests: 24799
Duration:       60.19s
```

Verdict — p95 325ms is well under the 500ms budget. The workload serialises
through Redis cache hits (60s TTL) for ~20 tokens, so every request after
the first 20 is a cache hit. p50 latency reflects the JWT-decode + DTO
validate + CacheService.get + enqueue-job round-trip, not DB time.

## Notes

- The global `ThrottlerGuard` (100 req/min per IP, tuned for login) is
  bypassed via `@SkipThrottle()` on the QR controller; the `DeviceThrottleGuard`
  (Redis-backed, 10/sec per device) is the authoritative rate limit for
  mobile scans.
- The `BullMQ scan-logs` queue did not backlog during the 60s test —
  `LLEN bull:scan-logs:wait` stayed at 0.
- The prepared statement `qr_lookup_v1` is warmed at `QrRepository.onModuleInit`
  with a dummy token so first real scan doesn't pay the PREPARE cost.
- Bump the prepared-statement name to `qr_lookup_v2` if the query shape
  changes (the statement name is per-connection in `postgres-js`).
