import { randomBytes, randomUUID } from "node:crypto";
import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";
import { db } from "../../db/client";
import { auditLogs } from "../../db/schema";
import type { RequestUser } from "../../common/types/request-user.type";
import { UsersService } from "../users/users.service";
import { ARGON_OPTS } from "./argon";
import { TokenService } from "./token.service";

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: RequestUser;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly dummyHashPromise: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {
    this.dummyHashPromise = hash(randomBytes(32).toString("hex"), ARGON_OPTS);
  }

  private async timingSafeVerify(
    hashOrNull: string | undefined,
    password: string,
  ): Promise<boolean> {
    const target = hashOrNull ?? (await this.dummyHashPromise);
    try {
      return await verify(target, password, ARGON_OPTS);
    } catch {
      return false;
    }
  }

  async validateUser(email: string, password: string): Promise<RequestUser> {
    const start = Date.now();
    const user = await this.users.findByEmail(email);
    const ok = await this.timingSafeVerify(user?.passwordHash, password);
    const elapsed = Date.now() - start;
    if (elapsed < 50) {
      this.logger.warn(
        { elapsed },
        "argon2 verify under 50ms - params may be misconfigured",
      );
    }

    if (!user || !ok) {
      throw new UnauthorizedException("Invalid credentials");
    }
    if (user.status !== "active") {
      throw new ForbiddenException("Account disabled");
    }
    if (user.agencyId && user.agencyStatus && user.agencyStatus !== "active") {
      throw new ForbiddenException("Agency suspended");
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      agencyId: user.agencyId,
    };
  }

  async login(
    email: string,
    password: string,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<LoginResult> {
    const user = await this.validateUser(email, password);
    const familyId = randomUUID();
    const accessToken = this.tokens.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
    });
    const { token: refreshToken } = await this.tokens.issueRefreshToken(
      user.id,
      familyId,
    );

    await this.users.markLogin(user.id);

    await this.writeAuditLog({
      userId: user.id,
      agencyId: user.agencyId,
      action: "login",
      ip,
      userAgent,
    });

    return { accessToken, refreshToken, user };
  }

  async refresh(
    refreshToken: string,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<RefreshResult> {
    const rotation = await this.tokens.rotateRefreshToken(refreshToken);
    const user = await this.users.findById(rotation.userId);
    if (!user) {
      await this.tokens.revokeFamily(rotation.familyId);
      throw new UnauthorizedException("Invalid credentials");
    }
    if (user.status !== "active") {
      await this.tokens.revokeFamily(rotation.familyId);
      throw new UnauthorizedException("Invalid credentials");
    }
    if (user.agencyId && user.agencyStatus && user.agencyStatus !== "active") {
      await this.tokens.revokeFamily(rotation.familyId);
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = this.tokens.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
    });

    await this.writeAuditLog({
      userId: user.id,
      agencyId: user.agencyId,
      action: "refresh",
      ip,
      userAgent,
    });

    return { accessToken, refreshToken: rotation.refreshToken };
  }

  async logout(
    refreshToken: string,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<void> {
    let userId: string | null = null;
    let agencyId: string | null = null;
    let familyId: string | null = null;
    try {
      const payload = this.tokens.verifyRefresh(refreshToken);
      familyId = payload.familyId;
      userId = payload.sub;
      const user = await this.users.findById(payload.sub);
      if (user) agencyId = user.agencyId;
    } catch {
      // token invalid - nothing to revoke, still log logout attempt for audit
    }

    if (familyId) {
      await this.tokens.revokeFamily(familyId);
    }

    await this.writeAuditLog({
      userId,
      agencyId,
      action: "logout",
      ip,
      userAgent,
    });
  }

  private async writeAuditLog(input: {
    userId: string | null;
    agencyId: string | null;
    action: "login" | "logout" | "refresh";
    ip: string | undefined;
    userAgent: string | undefined;
  }): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        agencyId: input.agencyId,
        userId: input.userId,
        action: input.action,
        entityType: "user",
        entityId: input.userId,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      });
    } catch (err: unknown) {
      this.logger.error({ err, action: input.action }, "audit insert failed");
    }
  }
}
