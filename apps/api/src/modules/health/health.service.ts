import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { sql as dsql } from "drizzle-orm";
import { sql } from "../../db/client";
import { RedisService } from "../redis/redis.service";

export interface HealthStatus {
  status: "ok" | "degraded";
  db: "up" | "down";
  redis: "up" | "down";
  uptime: number;
  version: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly version: string;

  constructor(private readonly redis: RedisService) {
    this.version = this.readVersion();
  }

  private readVersion(): string {
    try {
      const pkgPath = resolve(process.cwd(), "package.json");
      const raw = readFileSync(pkgPath, "utf-8");
      const parsed = JSON.parse(raw) as { version?: string };
      return parsed.version ?? "0.0.0";
    } catch {
      return "0.0.0";
    }
  }

  async check(): Promise<HealthStatus> {
    const [dbOk, redisOk] = await Promise.all([
      this.checkDb(),
      this.redis.ping(),
    ]);
    return {
      status: dbOk && redisOk ? "ok" : "degraded",
      db: dbOk ? "up" : "down",
      redis: redisOk ? "up" : "down",
      uptime: Math.round(process.uptime()),
      version: this.version,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await sql`select 1`;
      void dsql; // keep import for future drizzle-based health checks
      return true;
    } catch (err) {
      this.logger.warn({ err }, "db health check failed");
      return false;
    }
  }
}
