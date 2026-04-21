import { randomUUID } from "node:crypto";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Redis } from "ioredis";
import type {
  AccessJwtPayload,
  RefreshJwtPayload,
} from "../../common/types/jwt-payload.type";
import { RedisService } from "../redis/redis.service";

const BREADCRUMB_TTL_SEC = 60 * 5;

export interface RotationResult {
  userId: string;
  familyId: string;
  refreshToken: string;
  refreshJti: string;
}

function ttlStringToSeconds(ttl: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(ttl.trim());
  if (!m || !m[1] || !m[2]) {
    throw new Error(`invalid ttl: ${ttl}`);
  }
  const n = Number(m[1]);
  switch (m[2]) {
    case "s":
      return n;
    case "m":
      return n * 60;
    case "h":
      return n * 60 * 60;
    case "d":
      return n * 60 * 60 * 24;
    default:
      throw new Error(`invalid ttl unit: ${ttl}`);
  }
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtlSec: number;
  private readonly refreshTtlSec: number;
  private readonly redis: Redis;

  constructor(
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.accessSecret = this.cfg.getOrThrow<string>("JWT_ACCESS_SECRET");
    this.refreshSecret = this.cfg.getOrThrow<string>("JWT_REFRESH_SECRET");
    this.accessTtlSec = ttlStringToSeconds(
      this.cfg.get<string>("JWT_ACCESS_TTL") ?? "15m",
    );
    this.refreshTtlSec = ttlStringToSeconds(
      this.cfg.get<string>("JWT_REFRESH_TTL") ?? "30d",
    );
    this.redis = this.redisService.getClient();
  }

  generateAccessToken(
    payload: Omit<AccessJwtPayload, "type" | "iat" | "exp">,
  ): string {
    return this.jwt.sign(
      { ...payload, type: "access" },
      { secret: this.accessSecret, expiresIn: this.accessTtlSec },
    );
  }

  async issueRefreshToken(
    userId: string,
    familyId: string,
  ): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const payload: Omit<RefreshJwtPayload, "iat" | "exp"> = {
      sub: userId,
      jti,
      familyId,
      type: "refresh",
    };
    const token = this.jwt.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTtlSec,
    });
    await this.redis
      .multi()
      .set(`refresh:jti:${jti}`, familyId, "EX", this.refreshTtlSec)
      .hset(`refresh:family:${familyId}`, {
        currentJti: jti,
        userId,
        issuedAt: Date.now().toString(),
      })
      .expire(`refresh:family:${familyId}`, this.refreshTtlSec)
      .exec();
    return { token, jti };
  }

  verifyAccess(token: string): AccessJwtPayload {
    try {
      const payload = this.jwt.verify<AccessJwtPayload>(token, {
        secret: this.accessSecret,
      });
      if (payload.type !== "access") {
        throw new Error("wrong token type");
      }
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid credentials");
    }
  }

  verifyRefresh(token: string): RefreshJwtPayload {
    try {
      const payload = this.jwt.verify<RefreshJwtPayload>(token, {
        secret: this.refreshSecret,
      });
      if (payload.type !== "refresh") {
        throw new Error("wrong token type");
      }
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid credentials");
    }
  }

  /**
   * Rotates the refresh token, performing reuse detection. Returns the new refresh
   * token and the identified user id; caller is responsible for (re-)issuing the
   * access token with a fresh DB-derived payload.
   */
  async rotateRefreshToken(oldToken: string): Promise<RotationResult> {
    const payload = this.verifyRefresh(oldToken);
    const { sub: userId, jti: oldJti, familyId } = payload;

    const storedFamilyId = await this.redis.get(`refresh:jti:${oldJti}`);
    if (storedFamilyId === null) {
      const reuseFamilyId = await this.redis.get(`refresh:reuse:${oldJti}`);
      if (reuseFamilyId !== null) {
        this.logger.warn(
          { userId, familyId: reuseFamilyId, jti: oldJti },
          "refresh token reuse detected - revoking family",
        );
        await this.revokeFamily(reuseFamilyId);
      } else {
        this.logger.warn(
          { userId, familyId, jti: oldJti },
          "refresh token not found - revoked or expired",
        );
      }
      throw new UnauthorizedException("Invalid credentials");
    }

    if (storedFamilyId !== familyId) {
      this.logger.warn(
        { userId, familyId, storedFamilyId, jti: oldJti },
        "refresh token familyId mismatch - revoking both",
      );
      await this.revokeFamily(storedFamilyId);
      await this.revokeFamily(familyId);
      throw new UnauthorizedException("Invalid credentials");
    }

    const current = await this.redis.hget(
      `refresh:family:${familyId}`,
      "currentJti",
    );
    if (current !== oldJti) {
      this.logger.warn(
        { userId, familyId, expected: current, got: oldJti },
        "refresh token not current - revoking family",
      );
      await this.revokeFamily(familyId);
      throw new UnauthorizedException("Invalid credentials");
    }

    const newJti = randomUUID();
    const newRefreshToken = this.jwt.sign(
      { sub: userId, jti: newJti, familyId, type: "refresh" },
      { secret: this.refreshSecret, expiresIn: this.refreshTtlSec },
    );

    await this.redis
      .multi()
      .del(`refresh:jti:${oldJti}`)
      .set(`refresh:reuse:${oldJti}`, familyId, "EX", BREADCRUMB_TTL_SEC)
      .set(`refresh:jti:${newJti}`, familyId, "EX", this.refreshTtlSec)
      .hset(`refresh:family:${familyId}`, {
        currentJti: newJti,
        userId,
        issuedAt: Date.now().toString(),
      })
      .expire(`refresh:family:${familyId}`, this.refreshTtlSec)
      .exec();

    return {
      userId,
      familyId,
      refreshToken: newRefreshToken,
      refreshJti: newJti,
    };
  }

  async revokeFamily(familyId: string): Promise<void> {
    const key = `refresh:family:${familyId}`;
    const data = await this.redis.hgetall(key);
    if (data && data.currentJti) {
      await this.redis.del(`refresh:jti:${data.currentJti}`);
    }
    await this.redis.del(key);
  }

  async revokeAllUserTokens(userId: string): Promise<number> {
    const stream = this.redis.scanStream({
      match: "refresh:family:*",
      count: 100,
    });
    const victims: string[] = [];
    for await (const keys of stream as AsyncIterable<string[]>) {
      for (const key of keys) {
        const ownerId = await this.redis.hget(key, "userId");
        if (ownerId === userId) victims.push(key);
      }
    }
    for (const key of victims) {
      const familyId = key.slice("refresh:family:".length);
      await this.revokeFamily(familyId);
    }
    return victims.length;
  }
}
