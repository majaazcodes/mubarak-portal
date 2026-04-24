import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

// Dedicated pool for background workers so the scan-log processor
// can't starve request handlers under bursty scan traffic.
export const workerSql = postgres(databaseUrl, {
  max: 2,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {
    // silence postgres-js notice stream
  },
});

export const workerDb = drizzle(workerSql, { schema });

export type WorkerDB = typeof workerDb;

export async function closeWorkerDb(): Promise<void> {
  await workerSql.end({ timeout: 5 });
}
