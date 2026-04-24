import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { SCAN_LOG_JOB, SCAN_LOGS_QUEUE } from "./queues.constants";

export interface ScanLogJobData {
  agencyId: string;
  pilgrimId: string;
  scannedByUserId: string;
  qrToken: string;
  scannedAt: string; // ISO string
  lat?: number | null;
  lng?: number | null;
  deviceId?: string | null;
  wasOffline?: boolean;
}

@Injectable()
export class ScanLogProducer {
  private readonly logger = new Logger(ScanLogProducer.name);

  constructor(@InjectQueue(SCAN_LOGS_QUEUE) private readonly queue: Queue) {}

  async enqueue(data: ScanLogJobData): Promise<void> {
    try {
      await this.queue.add(SCAN_LOG_JOB, data);
    } catch (err) {
      // Fail-open: a dropped scan-log must never break the hot path.
      this.logger.error(
        { err, pilgrimId: data.pilgrimId },
        "scan-log enqueue failed",
      );
    }
  }
}
