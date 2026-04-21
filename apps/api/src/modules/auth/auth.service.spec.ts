import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { hash } from "@node-rs/argon2";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ARGON_OPTS } from "./argon";
import { AuthService } from "./auth.service";
import type { UserWithAgencyStatus } from "../users/users.repository";

// Mock the drizzle db module used by AuthService for audit-log inserts — we
// don't care about audit logs in these unit tests, we just need the call to be a no-op.
vi.mock("../../db/client", () => ({
  db: {
    insert: () => ({
      values: async () => undefined,
    }),
  },
}));

const USER_ID = "9e6a6169-528f-41f7-968a-1b55ee08dc8c";
const AGENCY_ID = "6f62cdcd-81e1-4ae2-b000-de31079d3471";

async function buildActiveUser(
  password: string,
): Promise<UserWithAgencyStatus> {
  const now = new Date();
  return {
    id: USER_ID,
    agencyId: AGENCY_ID,
    email: "admin@mubarak.com",
    passwordHash: await hash(password, ARGON_OPTS),
    role: "agency_admin",
    fullName: "Ghouse Mubarak",
    phone: null,
    status: "active",
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    agencyStatus: "active",
  };
}

describe("AuthService", () => {
  let usersMock: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    markLogin: ReturnType<typeof vi.fn>;
  };
  let tokensMock: {
    generateAccessToken: ReturnType<typeof vi.fn>;
    issueRefreshToken: ReturnType<typeof vi.fn>;
    rotateRefreshToken: ReturnType<typeof vi.fn>;
    verifyRefresh: ReturnType<typeof vi.fn>;
    revokeFamily: ReturnType<typeof vi.fn>;
  };
  let svc: AuthService;

  beforeEach(() => {
    usersMock = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      markLogin: vi.fn().mockResolvedValue(undefined),
    };
    tokensMock = {
      generateAccessToken: vi.fn(() => "access-token"),
      issueRefreshToken: vi
        .fn()
        .mockResolvedValue({ token: "refresh-token", jti: "jti-1" }),
      rotateRefreshToken: vi.fn(),
      verifyRefresh: vi.fn(),
      revokeFamily: vi.fn().mockResolvedValue(undefined),
    };
    svc = new AuthService(usersMock as never, tokensMock as never);
  });

  it("login success returns tokens + user", async () => {
    usersMock.findByEmail.mockResolvedValueOnce(
      await buildActiveUser("pw1234"),
    );
    const res = await svc.login(
      "admin@mubarak.com",
      "pw1234",
      "127.0.0.1",
      "curl",
    );
    expect(res.accessToken).toBe("access-token");
    expect(res.refreshToken).toBe("refresh-token");
    expect(res.user.email).toBe("admin@mubarak.com");
    expect(res.user.role).toBe("agency_admin");
    expect(usersMock.markLogin).toHaveBeenCalledWith(USER_ID);
  });

  it("login with wrong password throws UnauthorizedException", async () => {
    usersMock.findByEmail.mockResolvedValueOnce(
      await buildActiveUser("correct-pw"),
    );
    await expect(
      svc.login("admin@mubarak.com", "wrong-pw", "127.0.0.1", "curl"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("login with non-existent email throws UnauthorizedException (timing-safe)", async () => {
    usersMock.findByEmail.mockResolvedValueOnce(null);
    const start = Date.now();
    await expect(
      svc.login("nobody@example.com", "anything", "127.0.0.1", "curl"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const elapsed = Date.now() - start;
    // Fake hash should be verified → should take real argon2 time (>50ms on typical hw)
    expect(elapsed).toBeGreaterThan(50);
  });

  it("login with disabled user throws ForbiddenException", async () => {
    const user = await buildActiveUser("pw1234");
    user.status = "disabled";
    usersMock.findByEmail.mockResolvedValueOnce(user);
    await expect(
      svc.login("admin@mubarak.com", "pw1234", "127.0.0.1", "curl"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("login with suspended agency throws ForbiddenException", async () => {
    const user = await buildActiveUser("pw1234");
    user.agencyStatus = "suspended";
    usersMock.findByEmail.mockResolvedValueOnce(user);
    await expect(
      svc.login("admin@mubarak.com", "pw1234", "127.0.0.1", "curl"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refresh with valid token issues new access token and keeps rotated refresh", async () => {
    tokensMock.rotateRefreshToken.mockResolvedValueOnce({
      userId: USER_ID,
      familyId: "fam-1",
      refreshToken: "new-refresh",
      refreshJti: "jti-2",
    });
    usersMock.findById.mockResolvedValueOnce(await buildActiveUser("pw"));
    const res = await svc.refresh("old-refresh", "127.0.0.1", "curl");
    expect(res.accessToken).toBe("access-token");
    expect(res.refreshToken).toBe("new-refresh");
    expect(tokensMock.rotateRefreshToken).toHaveBeenCalledWith("old-refresh");
  });

  it("refresh with invalid/reused token propagates UnauthorizedException from TokenService", async () => {
    tokensMock.rotateRefreshToken.mockRejectedValueOnce(
      new UnauthorizedException("Invalid credentials"),
    );
    await expect(
      svc.refresh("stale-token", "127.0.0.1", "curl"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("refresh revokes family if user was deleted after rotation", async () => {
    tokensMock.rotateRefreshToken.mockResolvedValueOnce({
      userId: USER_ID,
      familyId: "fam-X",
      refreshToken: "new-refresh",
      refreshJti: "jti-2",
    });
    usersMock.findById.mockResolvedValueOnce(null);
    await expect(
      svc.refresh("old", "127.0.0.1", "curl"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokensMock.revokeFamily).toHaveBeenCalledWith("fam-X");
  });

  it("logout revokes the family in Redis", async () => {
    tokensMock.verifyRefresh.mockReturnValueOnce({
      sub: USER_ID,
      jti: "jti-1",
      familyId: "fam-Y",
      type: "refresh",
    });
    usersMock.findById.mockResolvedValueOnce(await buildActiveUser("pw"));
    await svc.logout("refresh-token", "127.0.0.1", "curl");
    expect(tokensMock.revokeFamily).toHaveBeenCalledWith("fam-Y");
  });

  it("logout with invalid refresh token still returns without throwing", async () => {
    tokensMock.verifyRefresh.mockImplementationOnce(() => {
      throw new UnauthorizedException("invalid");
    });
    await expect(
      svc.logout("garbage", "127.0.0.1", "curl"),
    ).resolves.toBeUndefined();
    expect(tokensMock.revokeFamily).not.toHaveBeenCalled();
  });
});
