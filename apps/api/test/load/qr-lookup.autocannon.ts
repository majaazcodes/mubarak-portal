/**
 * QR lookup load test — runs against a locally-running API (http://localhost:3000).
 *
 *   1. Start API:           pnpm --filter api start
 *      (or pnpm --filter api dev in another shell)
 *   2. Run this script:     pnpm --filter api tsx test/load/qr-lookup.autocannon.ts
 *
 * Uses admin@mubarak.com / Mubarak@123 from seed data.
 * Pulls 20 real QR tokens from hajj_dev and rotates through them.
 * 100 VUs, 60s test window, 10s warmup (results printed separately).
 */
import "dotenv/config";
import autocannon from "autocannon";
import postgres from "postgres";

const API_BASE = process.env.LOAD_TEST_API ?? "http://localhost:3000";
const TEST_EMAIL = "admin@mubarak.com";
const TEST_PASSWORD = "Mubarak@123";

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`login failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

async function fetchTokens(count: number): Promise<string[]> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = postgres(url, { max: 1 });
  try {
    const rows = await sql<{ token: string }[]>`
      SELECT token FROM qr_codes WHERE revoked_at IS NULL LIMIT ${count}
    `;
    return rows.map((r) => r.token);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function run(): Promise<void> {
  console.log("[load] logging in...");
  const jwt = await login();
  console.log("[load] fetched access token");

  console.log("[load] fetching 20 QR tokens from DB...");
  const tokens = await fetchTokens(20);
  if (tokens.length === 0) {
    throw new Error("no QR tokens in hajj_dev");
  }
  console.log(`[load] rotating through ${tokens.length} tokens`);

  // 500 devices so the DeviceThrottleGuard (10 req/sec/device) doesn't gate
  // the server-side hot path at the throughput levels we want to measure.
  const DEVICE_POOL = 500;
  const makeBody = (i: number): string =>
    JSON.stringify({
      token: tokens[i % tokens.length],
      deviceId: `load-device-${i % DEVICE_POOL}`,
      scannedAt: new Date().toISOString(),
    });

  const runPhase = (
    duration: number,
    title: string,
  ): Promise<autocannon.Result> =>
    new Promise((resolve, reject) => {
      let counter = 0;
      const instance = autocannon(
        {
          url: `${API_BASE}/api/v1/qr/lookup`,
          method: "POST",
          connections: 100,
          duration,
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${jwt}`,
          },
          setupClient: (client) => {
            client.setBody(makeBody(counter++));
            client.on("response", () => {
              client.setBody(makeBody(counter++));
            });
          },
          title,
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        },
      );
      autocannon.track(instance, { renderProgressBar: true });
    });

  console.log("\n=== WARMUP (10s) ===");
  await runPhase(10, "qr-lookup warmup");

  console.log("\n=== MEASUREMENT (60s) ===");
  const result = await runPhase(60, "qr-lookup measurement");

  console.log("\n=== RESULTS ===");
  console.log(`Requests/sec:   ${result.requests.average.toFixed(0)}`);
  console.log(`Latency p50:    ${result.latency.p50.toFixed(1)} ms`);
  console.log(`Latency p95:    ${result.latency.p97_5.toFixed(1)} ms`);
  console.log(`Latency p99:    ${result.latency.p99.toFixed(1)} ms`);
  console.log(`Latency max:    ${result.latency.max.toFixed(1)} ms`);
  console.log(`Errors:         ${result.errors}`);
  console.log(`Timeouts:       ${result.timeouts}`);
  console.log(`Non-2xx:        ${result.non2xx}`);
  console.log(`Total requests: ${result.requests.total}`);
  console.log(`Duration:       ${result.duration}s`);
}

run().catch((err) => {
  console.error("[load] FAILED:", err);
  process.exit(1);
});
