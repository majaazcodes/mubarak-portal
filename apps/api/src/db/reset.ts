import "dotenv/config";
import { execSync } from "node:child_process";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.error("[reset] refusing to reset database in production");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });

  console.log("[reset] dropping and recreating schemas (public + drizzle)");
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE;");
  await sql.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE;");
  await sql.unsafe("CREATE SCHEMA public;");
  await sql.unsafe("GRANT ALL ON SCHEMA public TO public;");

  console.log("[reset] applying migrations");
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./drizzle" });

  await sql.end({ timeout: 5 });

  console.log("[reset] running seed");
  execSync("tsx src/db/seed.ts", { stdio: "inherit" });

  console.log("[reset] ✓ done");
}

main().catch((err: unknown) => {
  console.error("[reset] failed:", err);
  process.exit(1);
});
