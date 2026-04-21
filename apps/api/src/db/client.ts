import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {
    // silence postgres-js notice stream
  },
});

export const db = drizzle(sql, { schema });

export type DB = typeof db;

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}

let shuttingDown = false;
const shutdown = (signal: string): void => {
  if (shuttingDown) return;
  shuttingDown = true;
  closeDb()
    .catch((err: unknown) => {
      console.error(`[db] error during shutdown (${signal}):`, err);
    })
    .finally(() => {
      process.exit(0);
    });
};

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
