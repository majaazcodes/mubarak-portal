import type { Env } from "./env.validation";

export interface AppConfig {
  databaseUrl: string;
  testDatabaseUrl: string | undefined;
  redisUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  port: number;
  nodeEnv: "development" | "test" | "production";
  corsOrigin: string;
  logLevel: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  isProd: boolean;
  isDev: boolean;
}

export function buildAppConfig(env: Env): AppConfig {
  return {
    databaseUrl: env.DATABASE_URL,
    testDatabaseUrl: env.TEST_DATABASE_URL,
    redisUrl: env.REDIS_URL,
    jwtAccessSecret: env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    jwtAccessTtl: env.JWT_ACCESS_TTL,
    jwtRefreshTtl: env.JWT_REFRESH_TTL,
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    corsOrigin: env.CORS_ORIGIN,
    logLevel: env.LOG_LEVEL,
    isProd: env.NODE_ENV === "production",
    isDev: env.NODE_ENV === "development",
  };
}

export const APP_CONFIG = "APP_CONFIG";
