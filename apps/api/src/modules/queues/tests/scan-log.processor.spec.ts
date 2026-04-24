import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi
  .fn()
  .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
const selectLimitMock = vi.fn();
const selectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: selectLimitMock,
};
const selectMock = vi.fn().mockReturnValue(selectChain);

vi.mock("../../../db/worker-client", () => ({
  workerDb: {
    select: (...args: unknown[]) => selectMock(...args),
    insert: (...args: unknown[]) => insertMock(...args),
  },
}));

import { ScanLogProcessor } from "../scan-log.processor";

function makeJob(data: Record<string, unknown>): {
  data: Record<string, unknown>;
} {
  return { data };
}

describe("ScanLogProcessor", () => {
  let proc: ScanLogProcessor;

  beforeEach(() => {
    proc = new ScanLogProcessor();
    selectLimitMock.mockReset();
    insertMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("inserts new scan when no duplicate in window", async () => {
    selectLimitMock.mockResolvedValueOnce([]);
    const res = await proc.process(
      makeJob({
        agencyId: "a1",
        pilgrimId: "p1",
        scannedByUserId: "u1",
        qrToken: "T".repeat(43),
        scannedAt: new Date().toISOString(),
        deviceId: "d1",
      }) as never,
    );
    expect(res).toEqual({ inserted: true });
    expect(insertMock).toHaveBeenCalled();
  });

  it("skips duplicate scan within 10s window", async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 42n }]);
    const res = await proc.process(
      makeJob({
        agencyId: "a1",
        pilgrimId: "p1",
        scannedByUserId: "u1",
        qrToken: "T".repeat(43),
        scannedAt: new Date().toISOString(),
        deviceId: "d1",
      }) as never,
    );
    expect(res).toEqual({ inserted: false });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts without idempotency check when deviceId absent", async () => {
    const res = await proc.process(
      makeJob({
        agencyId: "a1",
        pilgrimId: "p1",
        scannedByUserId: "u1",
        qrToken: "T".repeat(43),
        scannedAt: new Date().toISOString(),
      }) as never,
    );
    expect(res).toEqual({ inserted: true });
    expect(selectLimitMock).not.toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalled();
  });
});
