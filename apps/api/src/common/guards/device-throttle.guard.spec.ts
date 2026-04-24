import { Reflector } from "@nestjs/core";
import { BadRequestException, HttpException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceThrottleGuard } from "./device-throttle.guard";

interface MockCtx {
  switchToHttp: () => {
    getRequest: () => {
      body?: { deviceId?: string };
      headers?: Record<string, string>;
      url?: string;
    };
  };
  getHandler: () => unknown;
  getClass: () => unknown;
}

function makeCtx(body: unknown, headers: Record<string, string> = {}): MockCtx {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ body, headers, url: "/qr/lookup" }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as MockCtx;
}

describe("DeviceThrottleGuard", () => {
  let reflector: Reflector;
  let multiChain: {
    incr: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    exec: ReturnType<typeof vi.fn>;
  };
  let client: { multi: ReturnType<typeof vi.fn> };
  let redis: { getClient: () => typeof client };
  let guard: DeviceThrottleGuard;

  beforeEach(() => {
    reflector = new Reflector();
    multiChain = {
      incr: vi.fn(),
      expire: vi.fn(),
      exec: vi.fn(),
    };
    multiChain.incr.mockReturnValue(multiChain);
    multiChain.expire.mockReturnValue(multiChain);
    client = { multi: vi.fn().mockReturnValue(multiChain) };
    redis = { getClient: () => client };
    guard = new DeviceThrottleGuard(reflector, redis as never);
  });

  it("400s when deviceId missing from body and header", async () => {
    await expect(
      guard.canActivate(makeCtx({}) as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows 1st request and sets expire", async () => {
    multiChain.exec.mockResolvedValueOnce([
      [null, 1],
      [null, 1],
    ]);
    const ok = await guard.canActivate(makeCtx({ deviceId: "d1" }) as never);
    expect(ok).toBe(true);
    expect(multiChain.incr).toHaveBeenCalled();
    expect(multiChain.expire).toHaveBeenCalled();
  });

  it("429s at 11th request in same bucket", async () => {
    multiChain.exec.mockResolvedValueOnce([
      [null, 11],
      [null, 0],
    ]);
    await expect(
      guard.canActivate(makeCtx({ deviceId: "d1" }) as never),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("reads deviceId from X-Device-Id header when body lacks it", async () => {
    multiChain.exec.mockResolvedValueOnce([
      [null, 1],
      [null, 1],
    ]);
    const ok = await guard.canActivate(
      makeCtx({}, { "x-device-id": "d-header" }) as never,
    );
    expect(ok).toBe(true);
  });

  it("fails open when Redis multi returns null (outage)", async () => {
    multiChain.exec.mockResolvedValueOnce(null);
    const ok = await guard.canActivate(makeCtx({ deviceId: "d1" }) as never);
    expect(ok).toBe(true);
  });
});
