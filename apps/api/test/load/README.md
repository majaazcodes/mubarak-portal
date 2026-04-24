# QR Lookup Load Test

Scripted end-to-end benchmark of `POST /api/v1/qr/lookup` — the mission-critical
mobile-scan hot path.

## Run

```bash
# Terminal 1 — boot API
pnpm --filter api build
pnpm --filter api start

# Terminal 2 — run test
pnpm --filter api exec tsx test/load/qr-lookup.autocannon.ts
```

## What it does

1. Logs in as `admin@mubarak.com` / `Mubarak@123` and grabs the access token.
2. Pulls 20 real QR tokens from `hajj_dev` (1000 pilgrims seeded).
3. Warms the server for 10s (prepared-statement cache, JIT, Redis cache).
4. Runs 100 concurrent connections for 60s, rotating through the token pool.
5. Prints p50/p95/p99 latency, throughput, errors.

## Budget (pilot)

| Metric      | Target     |
| ----------- | ---------- |
| p95 latency | <500 ms    |
| Error rate  | <0.1%      |
| Throughput  | >200 req/s |

## Interpreting results

- First run populates the Redis cache. Expect warmup-phase p95 up to ~30ms.
- Measurement phase should show p50 <5ms once cached; p95 <15ms on cache hits.
- If you see p95 spikes during measurement, check whether the BullMQ
  scan-log queue is backlogging (watch Redis `LLEN bull:scan-logs:wait`).
