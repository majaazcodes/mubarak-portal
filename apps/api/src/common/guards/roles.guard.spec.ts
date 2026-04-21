import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "../../db/types";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { RolesGuard } from "./roles.guard";

function buildContext(user: { role: UserRole } | null): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it("allows when no @Roles metadata is set", () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    expect(guard.canActivate(buildContext({ role: "viewer" }))).toBe(true);
  });

  it("allows super_admin for any requirement", () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["agency_admin"]);
    expect(guard.canActivate(buildContext({ role: "super_admin" }))).toBe(true);
  });

  it("allows matching role", () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue([
      "agency_admin",
      "operator",
    ]);
    expect(guard.canActivate(buildContext({ role: "operator" }))).toBe(true);
  });

  it("rejects mismatched role", () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["agency_admin"]);
    expect(() => guard.canActivate(buildContext({ role: "viewer" }))).toThrow(
      ForbiddenException,
    );
  });

  it("rejects when no user on request", () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["agency_admin"]);
    expect(() => guard.canActivate(buildContext(null))).toThrow(
      ForbiddenException,
    );
  });

  it("does not leak required roles in the error message", () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["super_admin"]);
    try {
      guard.canActivate(buildContext({ role: "viewer" }));
    } catch (err) {
      expect((err as Error).message).toBe("Insufficient permissions");
      expect((err as Error).message).not.toContain("super_admin");
    }
    // Ensure ROLES_KEY is defined for the decorator contract
    expect(ROLES_KEY).toBe("roles");
  });
});
