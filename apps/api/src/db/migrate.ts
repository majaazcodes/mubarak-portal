import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  const db = drizzle(sql);

  const start = Date.now();
  console.log("[migrate] applying migrations from ./drizzle");
  await migrate(db, { migrationsFolder: "./drizzle" });
  const elapsed = Date.now() - start;
  console.log(`[migrate] ✓ migrations applied successfully (${elapsed}ms)`);

  await sql.end({ timeout: 5 });
}

main().catch((err: unknown) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
