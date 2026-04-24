import { z } from "zod";

// Validated at module load. Throws loudly if any required var is missing/bad —
// better to fail at boot than silently at runtime.
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith("http"), {
      message: "NEXT_PUBLIC_API_URL must start with http",
    }),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Mubarak Travels Admin"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  const flat = parsed.error.flatten().fieldErrors;
  const message = Object.entries(flat)
    .map(([k, v]) => `${k}: ${v?.join(", ")}`)
    .join("\n");
  throw new Error(`Invalid admin env vars:\n${message}`);
}

export const env = parsed.data;
