import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const insertValuesReturningMock = vi.fn();
const insertAuditValuesMock = vi.fn().mockResolvedValue(undefined);
const selectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
};
const selectMock = vi.fn().mockReturnValue(selectChain);

vi.mock("../../../db/client", () => ({
  db: {
    insert: (table: { _: unknown; tableName?: string } | unknown) => {
      const name =
        typeof table === "object" && table !== null && "_" in table
          ? ((table as { _: { name?: string } })._.name ?? "")
          : "";
      if (name === "audit_logs") {
        return { values: insertAuditValuesMock };
      }
      return {
        values: () => ({ returning: insertValuesReturningMock }),
      };
    },
    select: (...args: unknown[]) => selectMock(...args),
  },
}));

import { BulkImportService } from "../bulk-import.service";

const AGENCY_ID = "a1111111-1111-1111-1111-111111111111";
const USER_ID = "u1111111-1111-1111-1111-111111111111";

const CSV_MIME = "text/csv";

function fixturePath(): string {
  return path.resolve(
    __dirname,
    "../../../../tests/fixtures/pilgrims-bulk.csv",
  );
}

describe("BulkImportService", () => {
  let qr: { createForPilgrim: ReturnType<typeof vi.fn> };
  let cache: { invalidateAgencyLists: ReturnType<typeof vi.fn> };
  let svc: BulkImportService;
  let csvBuffer: Buffer;

  beforeEach(async () => {
    qr = {
      createForPilgrim: vi
        .fn()
        .mockResolvedValue({ token: "T".repeat(43), version: 1 }),
    };
    cache = {
      invalidateAgencyLists: vi.fn().mockResolvedValue(undefined),
    };
    svc = new BulkImportService(qr as never, cache as never);
    csvBuffer = await readFile(fixturePath());
    selectChain.from.mockReturnThis();
    selectChain.where.mockResolvedValue([]);
    insertValuesReturningMock.mockReset();
    insertAuditValuesMock.mockClear();
  });

  it("validate separates 3 valid rows from 2 invalid rows", async () => {
    const res = await svc.validate(csvBuffer, CSV_MIME, AGENCY_ID);
    expect(res.mode).toBe("validate");
    expect(res.valid).toBe(3);
    expect(res.invalid).toBeGreaterThanOrEqual(2);
    const passports = res.rows.map((r) => r.passportNo);
    expect(passports).toEqual(["A1234567", "B2345678", "C3456789"]);
  });

  it("validate flags invalid dob and missing fullName", async () => {
    const res = await svc.validate(csvBuffer, CSV_MIME, AGENCY_ID);
    const fields = res.errors.map((e) => e.field);
    expect(fields).toContain("dob");
    expect(fields).toContain("fullName");
  });

  it("validate upper-cases passportNo during normalization", async () => {
    const lower = Buffer.from(
      "fullName,passportNo,dob,gender\n" +
        "Test Person,a1234567,1990-01-01,male\n",
    );
    const res = await svc.validate(lower, CSV_MIME, AGENCY_ID);
    expect(res.rows[0]?.passportNo).toBe("A1234567");
  });

  it("validate rejects duplicates within the same file", async () => {
    const dup = Buffer.from(
      "fullName,passportNo,dob,gender\n" +
        "One,A1111111,1990-01-01,male\n" +
        "Two,A1111111,1990-01-02,female\n",
    );
    const res = await svc.validate(dup, CSV_MIME, AGENCY_ID);
    expect(res.valid).toBe(1);
    expect(res.errors.some((e) => e.message.includes("Duplicate of row"))).toBe(
      true,
    );
  });

  it("validate flags passports that already exist in the agency", async () => {
    selectChain.where.mockResolvedValueOnce([{ passportNo: "A1234567" }]);
    const res = await svc.validate(csvBuffer, CSV_MIME, AGENCY_ID);
    expect(res.valid).toBe(2);
    expect(
      res.errors.some(
        (e) => e.field === "passportNo" && e.message.includes("A1234567"),
      ),
    ).toBe(true);
  });

  it("commit inserts valid rows and issues QR for each", async () => {
    insertValuesReturningMock.mockResolvedValueOnce([
      { id: "p1" },
      { id: "p2" },
      { id: "p3" },
    ]);
    const res = await svc.commit(csvBuffer, CSV_MIME, AGENCY_ID, USER_ID);
    expect(res.mode).toBe("commit");
    expect(res.inserted).toBe(3);
    expect(qr.createForPilgrim).toHaveBeenCalledTimes(3);
    expect(cache.invalidateAgencyLists).toHaveBeenCalledWith(AGENCY_ID);
  });

  it("commit re-validates file (phase-2 never trusts client)", async () => {
    const invalidOnly = Buffer.from(
      "fullName,passportNo,dob,gender\n" + "Bad,not-passport,nope,male\n",
    );
    const res = await svc.commit(invalidOnly, CSV_MIME, AGENCY_ID, USER_ID);
    expect(res.inserted).toBe(0);
    expect(res.skipped).toBeGreaterThan(0);
    expect(insertValuesReturningMock).not.toHaveBeenCalled();
  });

  it("validate rejects unsupported mimetype", async () => {
    await expect(
      svc.validate(csvBuffer, "application/pdf", AGENCY_ID),
    ).rejects.toThrow(/Unsupported mimetype/);
  });

  it("validate caps rows at MAX_ROWS", async () => {
    const header = "fullName,passportNo,dob,gender\n";
    const row = (i: number) =>
      `Name${i},A${String(i).padStart(7, "0")},1990-01-01,male\n`;
    const oversize =
      header + Array.from({ length: 1001 }, (_, i) => row(i + 1)).join("");
    const res = await svc.validate(Buffer.from(oversize), CSV_MIME, AGENCY_ID);
    expect(res.valid).toBe(0);
    expect(res.errors[0]?.message).toMatch(/exceeds limit/);
  });
});
