import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BulkLimitExceededException,
  PilgrimNotFoundException,
  QrNotFoundException,
  QrRevokedException,
} from "../../../common/exceptions/app.exceptions";
import { BadgeService } from "../badge.service";

const AGENCY_ID = "a1111111-1111-1111-1111-111111111111";
const USER_ID = "u1111111-1111-1111-1111-111111111111";
const PILGRIM_ID = "p1111111-1111-1111-1111-111111111111";

const mockAgencyRow = {
  id: AGENCY_ID,
  name: "Mubarak Travels",
  country: "IN",
  contactEmail: "ops@mubarak.example",
  contactPhone: "+91 22 1234 5678",
  plan: "standard",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Chainable db mock covering both:
//   db.select().from().where().limit()  → [agencyRow]
//   db.insert().values()                 → resolved Promise (audit fire-and-forget)
vi.mock("../../../db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [mockAgencyRow],
        }),
      }),
    }),
    insert: () => ({
      values: async () => undefined,
    }),
  },
}));

function buildPilgrim(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: PILGRIM_ID,
    agencyId: AGENCY_ID,
    passportNo: "A1234567",
    fullName: "Abdul Karim",
    dob: "1970-01-01",
    gender: "male",
    nationality: "IN",
    nationalId: null,
    photoUrl: null,
    emergencyContact: {
      name: "Aisha",
      phone: "+919876543210",
      relation: "spouse",
    },
    travel: null,
    status: "active",
    notes: null,
    searchTsv: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    groups: [{ id: "g1", name: "Delhi Batch A" }],
    ...overrides,
  };
}

function buildQr(overrides: Partial<Record<string, unknown>> = {}): {
  id: string;
  pilgrimId: string;
  token: string;
  version: number;
  issuedAt: Date;
  revokedAt: Date | null;
} {
  return {
    id: "q1",
    pilgrimId: PILGRIM_ID,
    token: "A".repeat(43),
    version: 1,
    issuedAt: new Date(),
    revokedAt: null,
    ...overrides,
  } as {
    id: string;
    pilgrimId: string;
    token: string;
    version: number;
    issuedAt: Date;
    revokedAt: Date | null;
  };
}

describe("BadgeService", () => {
  let pilgrims: { findByIdInAgency: ReturnType<typeof vi.fn> };
  let qr: { getByPilgrim: ReturnType<typeof vi.fn> };
  let svc: BadgeService;

  beforeEach(() => {
    pilgrims = { findByIdInAgency: vi.fn() };
    qr = { getByPilgrim: vi.fn() };
    svc = new BadgeService(pilgrims as never, qr as never);
  });

  describe("generatePilgrimBadge", () => {
    it("returns a PDF buffer starting with %PDF", async () => {
      pilgrims.findByIdInAgency.mockResolvedValueOnce(buildPilgrim());
      qr.getByPilgrim.mockResolvedValueOnce(buildQr());
      const res = await svc.generatePilgrimBadge(
        PILGRIM_ID,
        AGENCY_ID,
        USER_ID,
      );
      expect(res.pdf.slice(0, 4).toString()).toBe("%PDF");
      expect(res.passport).toBe("A1234567");
      expect(res.fullName).toBe("Abdul Karim");
    });

    it("throws PilgrimNotFoundException when pilgrim not in agency", async () => {
      pilgrims.findByIdInAgency.mockResolvedValueOnce(null);
      await expect(
        svc.generatePilgrimBadge(PILGRIM_ID, AGENCY_ID, USER_ID),
      ).rejects.toBeInstanceOf(PilgrimNotFoundException);
      expect(qr.getByPilgrim).not.toHaveBeenCalled();
    });

    it("throws QrRevokedException when the qr row is revoked", async () => {
      pilgrims.findByIdInAgency.mockResolvedValueOnce(buildPilgrim());
      qr.getByPilgrim.mockResolvedValueOnce(buildQr({ revokedAt: new Date() }));
      await expect(
        svc.generatePilgrimBadge(PILGRIM_ID, AGENCY_ID, USER_ID),
      ).rejects.toBeInstanceOf(QrRevokedException);
    });

    it("propagates QrNotFoundException from the QR service", async () => {
      pilgrims.findByIdInAgency.mockResolvedValueOnce(buildPilgrim());
      qr.getByPilgrim.mockRejectedValueOnce(new QrNotFoundException());
      await expect(
        svc.generatePilgrimBadge(PILGRIM_ID, AGENCY_ID, USER_ID),
      ).rejects.toBeInstanceOf(QrNotFoundException);
    });

    it("handles a pilgrim with no assigned group", async () => {
      pilgrims.findByIdInAgency.mockResolvedValueOnce(
        buildPilgrim({ groups: [] }),
      );
      qr.getByPilgrim.mockResolvedValueOnce(buildQr());
      const res = await svc.generatePilgrimBadge(
        PILGRIM_ID,
        AGENCY_ID,
        USER_ID,
      );
      expect(res.pdf.slice(0, 4).toString()).toBe("%PDF");
    });
  });

  describe("generateBulkBadgesZip", () => {
    it("returns a ZIP buffer with the PK signature", async () => {
      pilgrims.findByIdInAgency.mockResolvedValue(buildPilgrim());
      qr.getByPilgrim.mockResolvedValue(buildQr());
      const ids = [PILGRIM_ID, PILGRIM_ID, PILGRIM_ID];
      const res = await svc.generateBulkBadgesZip(ids, AGENCY_ID, USER_ID);
      expect(res.count).toBe(3);
      expect(res.zip[0]).toBe(0x50); // P
      expect(res.zip[1]).toBe(0x4b); // K
      expect(res.zip[2]).toBe(0x03);
      expect(res.zip[3]).toBe(0x04);
    });

    it("throws BulkLimitExceededException above 500 ids", async () => {
      const ids = Array.from({ length: 501 }, () => PILGRIM_ID);
      await expect(
        svc.generateBulkBadgesZip(ids, AGENCY_ID, USER_ID),
      ).rejects.toBeInstanceOf(BulkLimitExceededException);
    });

    it("fails fast on cross-agency id within a batch", async () => {
      pilgrims.findByIdInAgency
        .mockResolvedValueOnce(buildPilgrim())
        .mockResolvedValueOnce(null);
      qr.getByPilgrim.mockResolvedValue(buildQr());
      await expect(
        svc.generateBulkBadgesZip([PILGRIM_ID, PILGRIM_ID], AGENCY_ID, USER_ID),
      ).rejects.toBeInstanceOf(PilgrimNotFoundException);
    });
  });
});
