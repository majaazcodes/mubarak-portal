import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  dialect: "postgresql",
  schema: "./src/db/schema/*",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://hajj:devonly@localhost:5432/hajj_dev",
  },
  strict: true,
  verbose: true,
} satisfies Config;
