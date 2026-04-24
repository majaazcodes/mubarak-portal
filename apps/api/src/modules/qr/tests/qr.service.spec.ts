import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CrossAgencyScanException,
  InvalidTokenFormatException,
  QrNotFoundException,
  QrRevokedException,
} from "../../../common/exceptions/app.exceptions";
import type { RequestUser } from "../../../common/types/request-user.type";
import { QrService } from "../qr.service";

vi.mock("../../../db/client", () => ({
  db: {
    insert: () => ({ values: () => Promise.resolve() }),
  },
}));

const AGENCY_ID = "a1111111-1111-1111-1111-111111111111";
const OTHER_AGENCY = "a2222222-2222-2222-2222-222222222222";
const USER_ID = "u1111111-1111-1111-1111-111111111111";
const VALID_TOKEN = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLM1234";

function makeUser(
  role: "agency_admin" | "operator" | "super_admin" = "operator",
): RequestUser {
  return {
    id: USER_ID,
    email: "operator@test.com",
    fullName: "Op",
    role,
    agencyId: AGENCY_ID,
  };
}

function makeRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    qrId: "q1",
    token: VALID_TOKEN,
    version: 1,
    revokedAt: null,
    pilgrimId: "p1",
    agencyId: AGENCY_ID,
    fullName: "Test",
    passportNo: "A1234567",
    nationality: "IN",
    gender: "male",
    status: "active",
    photoUrl: null,
    emergencyContact: null,
    groupName: "Group A",
    deletedAt: null,
    ...overrides,
  };
}

describe("QrService", () => {
  let repo: {
    lookupByToken: ReturnType<typeof vi.fn>;
    findByPilgrim: ReturnType<typeof vi.fn>;
    findActiveByPilgrim: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    revokeByPilgrim: ReturnType<typeof vi.fn>;
    replaceForPilgrim: ReturnType<typeof vi.fn>;
  };
  let cache: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    invalidateQr: ReturnType<typeof vi.fn>;
  };
  let scanLogs: { enqueue: ReturnType<typeof vi.fn> };
  let svc: QrService;

  beforeEach(() => {
    repo = {
      lookupByToken: vi.fn(),
      findByPilgrim: vi.fn(),
      findActiveByPilgrim: vi.fn(),
      insert: vi.fn(),
      revokeByPilgrim: vi.fn().mockResolvedValue(undefined),
      replaceForPilgrim: vi.fn(),
    };
    cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
      invalidateQr: vi.fn().mockResolvedValue(undefined),
    };
    scanLogs = { enqueue: vi.fn().mockResolvedValue(undefined) };
    svc = new QrService(repo as never, cache as never, scanLogs as never);
  });

  it("rejects bad token format fast without DB hit", async () => {
    await expect(
      svc.lookup({ token: "too-short", deviceId: "d1" }, makeUser()),
    ).rejects.toBeInstanceOf(InvalidTokenFormatException);
    expect(repo.lookupByToken).not.toHaveBeenCalled();
  });

  it("returns cached result when token cached with same agency", async () => {
    cache.get.mockResolvedValueOnce({
      pilgrimId: "p1",
      agencyId: AGENCY_ID,
      fullName: "Test",
      passportNo: "A1234567",
      nationality: "IN",
      gender: "male",
      status: "active",
      photoUrl: null,
      groupName: "G",
      emergencyContact: null,
      revokedAt: null,
    });
    const res = await svc.lookup(
      { token: VALID_TOKEN, deviceId: "d1" },
      makeUser(),
    );
    expect(res.cached).toBe(true);
    expect(repo.lookupByToken).not.toHaveBeenCalled();
    expect(scanLogs.enqueue).toHaveBeenCalled();
  });

  it("404s when QR not in DB", async () => {
    repo.lookupByToken.mockResolvedValueOnce(null);
    await expect(
      svc.lookup({ token: VALID_TOKEN, deviceId: "d1" }, makeUser()),
    ).rejects.toBeInstanceOf(QrNotFoundException);
  });

  it("410s when QR was revoked in DB", async () => {
    repo.lookupByToken.mockResolvedValueOnce(
      makeRow({ revokedAt: new Date() }),
    );
    await expect(
      svc.lookup({ token: VALID_TOKEN, deviceId: "d1" }, makeUser()),
    ).rejects.toBeInstanceOf(QrRevokedException);
  });

  it("404s when pilgrim was soft-deleted", async () => {
    repo.lookupByToken.mockResolvedValueOnce(
      makeRow({ deletedAt: new Date() }),
    );
    await expect(
      svc.lookup({ token: VALID_TOKEN, deviceId: "d1" }, makeUser()),
    ).rejects.toBeInstanceOf(QrNotFoundException);
  });

  it("403s on cross-agency scan for non-super_admin", async () => {
    repo.lookupByToken.mockResolvedValueOnce(
      makeRow({ agencyId: OTHER_AGENCY }),
    );
    await expect(
      svc.lookup({ token: VALID_TOKEN, deviceId: "d1" }, makeUser()),
    ).rejects.toBeInstanceOf(CrossAgencyScanException);
  });

  it("super_admin bypasses cross-agency check", async () => {
    repo.lookupByToken.mockResolvedValueOnce(
      makeRow({ agencyId: OTHER_AGENCY }),
    );
    const res = await svc.lookup(
      { token: VALID_TOKEN, deviceId: "d1" },
      makeUser("super_admin"),
    );
    expect(res.pilgrimId).toBe("p1");
  });

  it("caches result after DB fetch and enqueues scan-log", async () => {
    repo.lookupByToken.mockResolvedValueOnce(makeRow());
    const res = await svc.lookup(
      { token: VALID_TOKEN, deviceId: "d1" },
      makeUser(),
    );
    expect(res.cached).toBe(false);
    expect(cache.set).toHaveBeenCalledWith(
      `qr:${VALID_TOKEN}`,
      expect.objectContaining({ pilgrimId: "p1", agencyId: AGENCY_ID }),
      60,
    );
    expect(scanLogs.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        pilgrimId: "p1",
        agencyId: AGENCY_ID,
        qrToken: VALID_TOKEN,
        deviceId: "d1",
      }),
    );
  });

  it("createForPilgrim returns existing active token if any", async () => {
    repo.findByPilgrim.mockResolvedValueOnce({
      token: "E".repeat(43),
      version: 2,
      revokedAt: null,
    });
    const res = await svc.createForPilgrim("p1");
    expect(res.token).toBe("E".repeat(43));
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it("createForPilgrim inserts new token when none exists", async () => {
    repo.findByPilgrim.mockResolvedValueOnce(null);
    repo.insert.mockImplementationOnce((input: { token: string }) =>
      Promise.resolve({ token: input.token, version: 1 }),
    );
    const res = await svc.createForPilgrim("p1");
    expect(res.token).toHaveLength(43);
    expect(repo.insert).toHaveBeenCalled();
  });

  it("revoke skips gracefully when no QR exists", async () => {
    repo.findByPilgrim.mockResolvedValueOnce(null);
    await svc.revoke("p1");
    expect(repo.revokeByPilgrim).not.toHaveBeenCalled();
  });

  it("revoke invalidates cache for current token", async () => {
    repo.findByPilgrim.mockResolvedValueOnce({
      token: VALID_TOKEN,
      version: 1,
      revokedAt: null,
    });
    await svc.revoke("p1");
    expect(cache.invalidateQr).toHaveBeenCalledWith(VALID_TOKEN);
    expect(repo.revokeByPilgrim).toHaveBeenCalledWith("p1");
  });

  it("bulk sync skips cross-agency items with error code", async () => {
    repo.lookupByToken.mockResolvedValueOnce(
      makeRow({ agencyId: OTHER_AGENCY }),
    );
    const res = await svc.bulkSync(
      {
        deviceId: "d1",
        scans: [
          {
            token: VALID_TOKEN,
            scannedAt: new Date().toISOString(),
            wasOffline: true,
          },
        ],
      },
      makeUser(),
    );
    expect(res.accepted).toBe(0);
    expect(res.rejected).toEqual([{ index: 0, error: "CROSS_AGENCY_SCAN" }]);
  });
});
