import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PassportDuplicateException,
  PilgrimNotFoundException,
} from "../../../common/exceptions/app.exceptions";
import { PilgrimsService } from "../pilgrims.service";

vi.mock("../../../db/client", () => ({
  db: {
    insert: () => ({ values: async () => undefined }),
  },
}));

const AGENCY_ID = "a1111111-1111-1111-1111-111111111111";
const USER_ID = "u1111111-1111-1111-1111-111111111111";

function buildPilgrim(id: string): Record<string, unknown> {
  const now = new Date();
  return {
    id,
    agencyId: AGENCY_ID,
    passportNo: "A9999999",
    fullName: "Test Pilgrim",
    dob: "1970-01-01",
    gender: "male",
    nationality: "IN",
    nationalId: null,
    photoUrl: null,
    emergencyContact: null,
    travel: null,
    status: "active",
    notes: null,
    searchTsv: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    groups: [] as { id: string; name: string }[],
  };
}

describe("PilgrimsService", () => {
  let repo: {
    list: ReturnType<typeof vi.fn>;
    findByIdInAgency: ReturnType<typeof vi.fn>;
    existsByPassport: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let cache: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    delPattern: ReturnType<typeof vi.fn>;
    invalidatePilgrim: ReturnType<typeof vi.fn>;
    invalidateQr: ReturnType<typeof vi.fn>;
    invalidateAgencyLists: ReturnType<typeof vi.fn>;
  };
  let svc: PilgrimsService;

  beforeEach(() => {
    repo = {
      list: vi.fn(),
      findByIdInAgency: vi.fn(),
      existsByPassport: vi.fn().mockResolvedValue(false),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    };
    cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
      delPattern: vi.fn().mockResolvedValue(0),
      invalidatePilgrim: vi.fn().mockResolvedValue(undefined),
      invalidateQr: vi.fn().mockResolvedValue(undefined),
      invalidateAgencyLists: vi.fn().mockResolvedValue(undefined),
    };
    svc = new PilgrimsService(repo as never, cache as never);
  });

  it("list clamps page and limit to safe bounds", async () => {
    repo.list.mockResolvedValueOnce({ items: [], total: 0 });
    await svc.list({ page: 0, limit: 10000 }, AGENCY_ID);
    const call = repo.list.mock.calls[0]?.[0];
    expect(call.page).toBe(1);
    expect(call.limit).toBe(100);
  });

  it("list returns cached value when present", async () => {
    const cached = {
      items: [{ id: "p1" }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    cache.get.mockResolvedValueOnce(cached);
    const res = await svc.list({}, AGENCY_ID);
    expect(res).toEqual(cached);
    expect(repo.list).not.toHaveBeenCalled();
  });

  it("getById throws when not in agency", async () => {
    repo.findByIdInAgency.mockResolvedValueOnce(null);
    await expect(svc.getById("p1", AGENCY_ID, USER_ID)).rejects.toBeInstanceOf(
      PilgrimNotFoundException,
    );
  });

  it("getById uses cached value only when agency matches", async () => {
    const cached = { ...buildPilgrim("p1"), agencyId: "other-agency" };
    cache.get.mockResolvedValueOnce(cached);
    repo.findByIdInAgency.mockResolvedValueOnce(null);
    await expect(svc.getById("p1", AGENCY_ID, USER_ID)).rejects.toBeInstanceOf(
      PilgrimNotFoundException,
    );
  });

  it("create rejects duplicate passport with PassportDuplicateException", async () => {
    repo.existsByPassport.mockResolvedValueOnce(true);
    await expect(
      svc.create(
        {
          passportNo: "A1000001",
          fullName: "Dup",
          dob: "1970-01-01",
          gender: "male",
        },
        AGENCY_ID,
        USER_ID,
      ),
    ).rejects.toBeInstanceOf(PassportDuplicateException);
  });

  it("create uppercases passportNo and invalidates list cache", async () => {
    repo.create.mockResolvedValueOnce(buildPilgrim("p1"));
    await svc.create(
      {
        passportNo: "a9999999",
        fullName: "New",
        dob: "1970-01-01",
        gender: "male",
      },
      AGENCY_ID,
      USER_ID,
    );
    const passed = repo.create.mock.calls[0]?.[0];
    expect(passed.passportNo).toBe("A9999999");
    expect(cache.invalidateAgencyLists).toHaveBeenCalledWith(AGENCY_ID);
  });

  it("update rejects if pilgrim missing", async () => {
    repo.findByIdInAgency.mockResolvedValueOnce(null);
    await expect(
      svc.update("p1", { fullName: "X" }, AGENCY_ID, USER_ID),
    ).rejects.toBeInstanceOf(PilgrimNotFoundException);
  });

  it("update passes patch to repo and invalidates caches", async () => {
    const before = buildPilgrim("p1");
    const after = { ...before, notes: "Updated" };
    repo.findByIdInAgency.mockResolvedValueOnce(before);
    repo.update.mockResolvedValueOnce(after);
    const result = await svc.update(
      "p1",
      { notes: "Updated" },
      AGENCY_ID,
      USER_ID,
    );
    expect(result.notes).toBe("Updated");
    expect(cache.invalidatePilgrim).toHaveBeenCalledWith("p1", AGENCY_ID);
  });

  it("update rejects passport change that collides with existing", async () => {
    const before = { ...buildPilgrim("p1"), passportNo: "A1111111" };
    repo.findByIdInAgency.mockResolvedValueOnce(before);
    repo.existsByPassport.mockResolvedValueOnce(true);
    await expect(
      svc.update("p1", { passportNo: "A2222222" }, AGENCY_ID, USER_ID),
    ).rejects.toBeInstanceOf(PassportDuplicateException);
  });

  it("delete throws when pilgrim missing", async () => {
    repo.findByIdInAgency.mockResolvedValueOnce(null);
    await expect(svc.delete("p1", AGENCY_ID, USER_ID)).rejects.toBeInstanceOf(
      PilgrimNotFoundException,
    );
  });

  it("delete soft-deletes and invalidates caches", async () => {
    repo.findByIdInAgency.mockResolvedValueOnce(buildPilgrim("p1"));
    repo.softDelete.mockResolvedValueOnce(true);
    await svc.delete("p1", AGENCY_ID, USER_ID);
    expect(cache.invalidatePilgrim).toHaveBeenCalledWith("p1", AGENCY_ID);
  });
});
