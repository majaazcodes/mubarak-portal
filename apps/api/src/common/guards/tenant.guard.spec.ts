import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { TenantGuard } from "./tenant.guard";

function buildContext(
  user: { role: string; agencyId: string | null } | null,
  params: Record<string, string> = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("TenantGuard", () => {
  const guard = new TenantGuard();

  it("rejects when no user", () => {
    expect(() => guard.canActivate(buildContext(null))).toThrow(
      ForbiddenException,
    );
  });

  it("allows super_admin to access any tenant", () => {
    const ctx = buildContext(
      { role: "super_admin", agencyId: null },
      { agencyId: "different-agency" },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("allows when path agencyId matches user.agencyId", () => {
    const ctx = buildContext(
      { role: "agency_admin", agencyId: "a-1" },
      { agencyId: "a-1" },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("rejects cross-tenant access", () => {
    const ctx = buildContext(
      { role: "agency_admin", agencyId: "a-1" },
      { agencyId: "a-2" },
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("allows when no agencyId param is present (non-tenant-scoped route)", () => {
    const ctx = buildContext({ role: "agency_admin", agencyId: "a-1" }, {});
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
