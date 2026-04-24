import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { and, eq, gte, lte } from "drizzle-orm";
import type { Job } from "bullmq";
import { workerDb } from "../../db/worker-client";
import { scanLogs } from "../../db/schema";
import { SCAN_LOGS_QUEUE } from "./queues.constants";
import type { ScanLogJobData } from "./scan-log.producer";

const IDEMPOTENCY_WINDOW_MS = 10_000;

@Processor(SCAN_LOGS_QUEUE)
export class ScanLogProcessor extends WorkerHost {
  private readonly logger = new Logger(ScanLogProcessor.name);

  async process(job: Job<ScanLogJobData>): Promise<{ inserted: boolean }> {
    const data = job.data;
    const scannedAt = new Date(data.scannedAt);

    if (data.deviceId) {
      const lo = new Date(scannedAt.getTime() - IDEMPOTENCY_WINDOW_MS);
      const hi = new Date(scannedAt.getTime() + IDEMPOTENCY_WINDOW_MS);
      const dup = await workerDb
        .select({ id: scanLogs.id })
        .from(scanLogs)
        .where(
          and(
            eq(scanLogs.pilgrimId, data.pilgrimId),
            eq(scanLogs.deviceId, data.deviceId),
            gte(scanLogs.scannedAt, lo),
            lte(scanLogs.scannedAt, hi),
          ),
        )
        .limit(1);
      if (dup.length > 0) {
        this.logger.debug(
          { pilgrimId: data.pilgrimId, deviceId: data.deviceId },
          "scan-log idempotent skip",
        );
        return { inserted: false };
      }
    }

    await workerDb.insert(scanLogs).values({
      agencyId: data.agencyId,
      pilgrimId: data.pilgrimId,
      scannedByUserId: data.scannedByUserId,
      qrToken: data.qrToken,
      scannedAt,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      deviceId: data.deviceId ?? null,
      wasOffline: data.wasOffline ?? false,
    });

    return { inserted: true };
  }
}
