import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "../../modules/redis/redis.service";

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.getClient().get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn({ err, key }, "cache get failed");
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis
        .getClient()
        .set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (err) {
      this.logger.warn({ err, key }, "cache set failed");
    }
  }

  async del(keys: string | string[]): Promise<void> {
    try {
      const arr = Array.isArray(keys) ? keys : [keys];
      if (arr.length === 0) return;
      await this.redis.getClient().del(...arr);
    } catch (err) {
      this.logger.warn({ err, keys }, "cache del failed");
    }
  }

  /**
   * SCAN-based pattern delete. Never uses KEYS (which blocks Redis).
   * Safe for hot path; bounded by COUNT per iteration.
   */
  async delPattern(pattern: string): Promise<number> {
    const client = this.redis.getClient();
    let deleted = 0;
    try {
      const stream = client.scanStream({ match: pattern, count: 100 });
      for await (const keys of stream as AsyncIterable<string[]>) {
        if (keys.length === 0) continue;
        const n = await client.del(...keys);
        deleted += n;
      }
    } catch (err) {
      this.logger.warn({ err, pattern }, "cache delPattern failed");
    }
    return deleted;
  }

  async invalidatePilgrim(pilgrimId: string, agencyId: string): Promise<void> {
    await Promise.all([
      this.del(`pilgrim:${pilgrimId}`),
      this.delPattern(`pilgrims:list:${agencyId}:*`),
    ]);
  }

  async invalidateQr(token: string): Promise<void> {
    await this.del(`qr:${token}`);
  }

  async invalidateAgencyLists(agencyId: string): Promise<void> {
    await this.delPattern(`pilgrims:list:${agencyId}:*`);
    await this.del(`groups:${agencyId}`);
  }
}
