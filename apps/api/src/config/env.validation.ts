import { z } from "zod";

const envSchema = z
  .object({
    DATABASE_URL: z.string().startsWith("postgresql://", {
      message: "DATABASE_URL must start with postgresql://",
    }),
    TEST_DATABASE_URL: z.string().startsWith("postgresql://").optional(),
    REDIS_URL: z
      .string()
      .startsWith("redis://")
      .default("redis://localhost:6379"),
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, "JWT_ACCESS_SECRET must be >= 32 chars"),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, "JWT_REFRESH_SECRET must be >= 32 chars"),
    JWT_ACCESS_TTL: z.string().default("15m"),
    JWT_REFRESH_TTL: z.string().default("30d"),
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal"])
      .default("info"),
  })
  .refine((v) => v.JWT_ACCESS_SECRET !== v.JWT_REFRESH_SECRET, {
    message: "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different",
    path: ["JWT_REFRESH_SECRET"],
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    // eslint-disable-next-line no-console
    console.error(`\n[config] Invalid environment variables:\n${errors}\n`);
    process.exit(1);
  }
  return parsed.data;
}
