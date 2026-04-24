import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GroupHasPilgrimsException,
  GroupNotFoundException,
} from "../../../common/exceptions/app.exceptions";
import { GroupsService } from "../groups.service";

vi.mock("../../../db/client", () => ({
  db: {
    insert: () => ({ values: async () => undefined }),
  },
}));

const AGENCY_ID = "a1111111-1111-1111-1111-111111111111";
const USER_ID = "u1111111-1111-1111-1111-111111111111";

function buildGroup(id: string, name = "Group A"): Record<string, unknown> {
  const now = new Date();
  return {
    id,
    agencyId: AGENCY_ID,
    name,
    leaderUserId: null,
    departureDate: null,
    returnDate: null,
    maxSize: 50,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("GroupsService", () => {
  let repo: {
    listByAgency: ReturnType<typeof vi.fn>;
    findByIdInAgency: ReturnType<typeof vi.fn>;
    countPilgrims: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
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
  let svc: GroupsService;

  beforeEach(() => {
    repo = {
      listByAgency: vi.fn(),
      findByIdInAgency: vi.fn(),
      countPilgrims: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
    svc = new GroupsService(repo as never, cache as never);
  });

  it("listForAgency returns cached value when present", async () => {
    const cached = [{ ...buildGroup("g1"), pilgrimCount: 5 }];
    cache.get.mockResolvedValueOnce(cached);
    const rows = await svc.listForAgency(AGENCY_ID);
    expect(rows).toEqual(cached);
    expect(repo.listByAgency).not.toHaveBeenCalled();
  });

  it("listForAgency hits DB and caches on miss", async () => {
    const fresh = [{ ...buildGroup("g1"), pilgrimCount: 3 }];
    repo.listByAgency.mockResolvedValueOnce(fresh);
    const rows = await svc.listForAgency(AGENCY_ID);
    expect(rows).toEqual(fresh);
    expect(cache.set).toHaveBeenCalledWith(`groups:${AGENCY_ID}`, fresh, 60);
  });

  it("getById throws GroupNotFoundException when missing or cross-agency", async () => {
    repo.findByIdInAgency.mockResolvedValueOnce(null);
    await expect(svc.getById("g1", AGENCY_ID)).rejects.toBeInstanceOf(
      GroupNotFoundException,
    );
  });

  it("create inserts, invalidates cache, writes audit", async () => {
    const created = buildGroup("g1");
    repo.create.mockResolvedValueOnce(created);
    const result = await svc.create({ name: "Group A" }, AGENCY_ID, USER_ID);
    expect(result).toEqual(created);
    expect(cache.del).toHaveBeenCalledWith(`groups:${AGENCY_ID}`);
  });

  it("update rejects when group missing", async () => {
    repo.findByIdInAgency.mockResolvedValueOnce(null);
    await expect(
      svc.update("g1", { name: "Renamed" }, AGENCY_ID, USER_ID),
    ).rejects.toBeInstanceOf(GroupNotFoundException);
  });

  it("update patches fields and invalidates cache", async () => {
    const before = buildGroup("g1", "Group A");
    const after = { ...before, name: "Group Alpha" };
    repo.findByIdInAgency.mockResolvedValueOnce(before);
    repo.update.mockResolvedValueOnce(after);
    const result = await svc.update(
      "g1",
      { name: "Group Alpha" },
      AGENCY_ID,
      USER_ID,
    );
    expect(result.name).toBe("Group Alpha");
    expect(cache.del).toHaveBeenCalledWith(`groups:${AGENCY_ID}`);
  });

  it("delete rejects when pilgrims assigned", async () => {
    repo.findByIdInAgency.mockResolvedValueOnce(buildGroup("g1"));
    repo.countPilgrims.mockResolvedValueOnce(200);
    await expect(svc.delete("g1", AGENCY_ID, USER_ID)).rejects.toBeInstanceOf(
      GroupHasPilgrimsException,
    );
  });

  it("delete succeeds when no pilgrims assigned", async () => {
    repo.findByIdInAgency.mockResolvedValueOnce(buildGroup("g1"));
    repo.countPilgrims.mockResolvedValueOnce(0);
    repo.delete.mockResolvedValueOnce(true);
    await expect(svc.delete("g1", AGENCY_ID, USER_ID)).resolves.toBeUndefined();
    expect(cache.del).toHaveBeenCalledWith(`groups:${AGENCY_ID}`);
  });
});
