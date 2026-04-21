import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const TEST_DB_NAME = "hajj_test";

async function main(): Promise<void> {
  const devUrl =
    process.env.DATABASE_URL ??
    "postgresql://hajj:devonly@localhost:5432/hajj_dev";
  const testUrl =
    process.env.TEST_DATABASE_URL ??
    devUrl.replace(/\/hajj_dev$/, `/${TEST_DB_NAME}`);

  // Connect to the default 'postgres' DB to create the test DB if needed.
  const adminUrl = devUrl.replace(/\/[^/]+$/, "/postgres");
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });

  const rows =
    await admin`SELECT 1 FROM pg_database WHERE datname = ${TEST_DB_NAME}`;
  if (rows.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`[test-db] creating ${TEST_DB_NAME}`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[test-db] ${TEST_DB_NAME} exists`);
  }
  await admin.end({ timeout: 5 });

  // Run migrations against the test DB.
  const testClient = postgres(testUrl, { max: 1, onnotice: () => {} });
  const db = drizzle(testClient);
  // eslint-disable-next-line no-console
  console.log("[test-db] applying migrations");
  await migrate(db, { migrationsFolder: "./drizzle" });
  await testClient.end({ timeout: 5 });
  // eslint-disable-next-line no-console
  console.log("[test-db] ✓ ready");
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("[test-db] failed:", err);
  process.exit(1);
});
