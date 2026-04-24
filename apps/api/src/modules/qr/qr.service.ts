import { randomBytes } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { db } from "../../db/client";
import { auditLogs } from "../../db/schema";
import { CacheService } from "../../common/services/cache.service";
import {
  CrossAgencyScanException,
  InvalidTokenFormatException,
  PilgrimNotFoundException,
  QrNotFoundException,
  QrRevokedException,
} from "../../common/exceptions/app.exceptions";
import type { EmergencyContact, QrCode } from "../../db/types";
import type { RequestUser } from "../../common/types/request-user.type";
import type { QrLookupDto } from "./dto/qr-lookup.dto";
import type { QrLookupResponse } from "./dto/qr-lookup-response.dto";
import type {
  BulkScanItemDto,
  BulkSyncScansDto,
} from "./dto/bulk-sync-scans.dto";
import { QrRepository } from "./qr.repository";
import {
  ScanLogProducer,
  type ScanLogJobData,
} from "../queues/scan-log.producer";

const TOKEN_CACHE_TTL_SEC = 60;
const TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;

interface QrCachePayload {
  pilgrimId: string;
  agencyId: string;
  fullName: string;
  passportNo: string;
  nationality: string | null;
  gender: "male" | "female";
  status: "pending" | "active" | "completed" | "issue";
  photoUrl: string | null;
  groupName: string | null;
  emergencyContact: EmergencyContact | null;
  revokedAt: string | null;
}

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);

  constructor(
    private readonly repo: QrRepository,
    private readonly cache: CacheService,
    private readonly scanLogs: ScanLogProducer,
  ) {}

  // Hot path — mobile scans during Hajj.
  async lookup(dto: QrLookupDto, user: RequestUser): Promise<QrLookupResponse> {
    if (!TOKEN_REGEX.test(dto.token)) {
      throw new InvalidTokenFormatException();
    }

    const scannedAt = dto.scannedAt ?? new Date().toISOString();
    const cacheKey = `qr:${dto.token}`;

    const cached = await this.cache.get<QrCachePayload>(cacheKey);
    if (cached) {
      if (cached.revokedAt) throw new QrRevokedException();
      this.enforceAgency(cached.agencyId, user, dto.token);
      await this.enqueueScanLog(cached, user, dto, scannedAt);
      return this.toResponse(cached, scannedAt, true);
    }

    const row = await this.repo.lookupByToken(dto.token);
    if (!row || row.deletedAt) {
      throw new QrNotFoundException();
    }
    if (row.revokedAt) {
      throw new QrRevokedException();
    }

    this.enforceAgency(row.agencyId, user, dto.token);

    const payload: QrCachePayload = {
      pilgrimId: row.pilgrimId,
      agencyId: row.agencyId,
      fullName: row.fullName,
      passportNo: row.passportNo,
      nationality: row.nationality,
      gender: row.gender,
      status: row.status,
      photoUrl: row.photoUrl,
      groupName: row.groupName,
      emergencyContact: row.emergencyContact as EmergencyContact | null,
      revokedAt: null,
    };
    await this.cache.set(cacheKey, payload, TOKEN_CACHE_TTL_SEC);
    await this.enqueueScanLog(payload, user, dto, scannedAt);
    return this.toResponse(payload, scannedAt, false);
  }

  async bulkSync(
    dto: BulkSyncScansDto,
    user: RequestUser,
  ): Promise<{
    accepted: number;
    rejected: { index: number; error: string }[];
  }> {
    const agencyId = user.agencyId;
    if (!agencyId) throw new CrossAgencyScanException();

    let accepted = 0;
    const rejected: { index: number; error: string }[] = [];

    for (let i = 0; i < dto.scans.length; i++) {
      const scan = dto.scans[i];
      if (!scan) continue;
      try {
        await this.processBulkItem(scan, dto.deviceId, user, agencyId);
        accepted++;
      } catch (err) {
        const code = this.errorCode(err);
        rejected.push({ index: i, error: code });
      }
    }
    return { accepted, rejected };
  }

  async createForPilgrim(
    pilgrimId: string,
  ): Promise<{ token: string; version: number }> {
    const existing = await this.repo.findByPilgrim(pilgrimId);
    if (existing && !existing.revokedAt) {
      return { token: existing.token, version: existing.version };
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const token = generateToken();
      try {
        const row = existing
          ? await this.repo.replaceForPilgrim(
              pilgrimId,
              token,
              existing.version + 1,
            )
          : await this.repo.insert({ pilgrimId, token, version: 1 });
        return { token: row.token, version: row.version };
      } catch (err) {
        if (attempt === 2) throw err;
        this.logger.warn(
          { attempt, pilgrimId },
          "qr token collision, retrying",
        );
      }
    }
    throw new Error("qr generation exhausted retries");
  }

  async revoke(pilgrimId: string): Promise<void> {
    const existing = await this.repo.findByPilgrim(pilgrimId);
    if (!existing) return;
    await this.repo.revokeByPilgrim(pilgrimId);
    await this.cache.invalidateQr(existing.token);
  }

  async regenerate(
    pilgrimId: string,
    agencyId: string,
    userId: string,
  ): Promise<QrCode> {
    const existing = await this.repo.findByPilgrim(pilgrimId);
    if (!existing) throw new PilgrimNotFoundException();

    for (let attempt = 0; attempt < 3; attempt++) {
      const token = generateToken();
      try {
        const row = await this.repo.replaceForPilgrim(
          pilgrimId,
          token,
          existing.version + 1,
        );
        await this.cache.invalidateQr(existing.token);
        this.writeAudit(userId, agencyId, "qr_regenerate", pilgrimId);
        return row;
      } catch (err) {
        if (attempt === 2) throw err;
        this.logger.warn({ attempt, pilgrimId }, "qr regenerate collision");
      }
    }
    throw new Error("qr regenerate exhausted retries");
  }

  async getByPilgrim(pilgrimId: string): Promise<QrCode> {
    const row = await this.repo.findByPilgrim(pilgrimId);
    if (!row) throw new QrNotFoundException();
    return row;
  }

  private async processBulkItem(
    scan: BulkScanItemDto,
    deviceId: string,
    user: RequestUser,
    agencyId: string,
  ): Promise<void> {
    if (!TOKEN_REGEX.test(scan.token)) {
      throw new InvalidTokenFormatException();
    }

    const cacheKey = `qr:${scan.token}`;
    let payload = await this.cache.get<QrCachePayload>(cacheKey);
    if (!payload) {
      const row = await this.repo.lookupByToken(scan.token);
      if (!row || row.deletedAt) throw new QrNotFoundException();
      if (row.revokedAt) throw new QrRevokedException();
      payload = {
        pilgrimId: row.pilgrimId,
        agencyId: row.agencyId,
        fullName: row.fullName,
        passportNo: row.passportNo,
        nationality: row.nationality,
        gender: row.gender,
        status: row.status,
        photoUrl: row.photoUrl,
        groupName: row.groupName,
        emergencyContact: row.emergencyContact as EmergencyContact | null,
        revokedAt: null,
      };
      await this.cache.set(cacheKey, payload, TOKEN_CACHE_TTL_SEC);
    }
    if (payload.agencyId !== agencyId && user.role !== "super_admin") {
      throw new CrossAgencyScanException();
    }

    const jobData: ScanLogJobData = {
      agencyId: payload.agencyId,
      pilgrimId: payload.pilgrimId,
      scannedByUserId: user.id,
      qrToken: scan.token,
      scannedAt: scan.scannedAt,
      lat: scan.lat ?? null,
      lng: scan.lng ?? null,
      deviceId,
      wasOffline: scan.wasOffline ?? true,
    };
    await this.scanLogs.enqueue(jobData);
  }

  private enforceAgency(
    qrAgencyId: string,
    user: RequestUser,
    token: string,
  ): void {
    if (user.role === "super_admin") return;
    if (user.agencyId === qrAgencyId) return;

    this.logger.warn(
      {
        userId: user.id,
        userAgency: user.agencyId,
        attemptedAgency: qrAgencyId,
        tokenPrefix: token.slice(0, 6),
      },
      "cross-agency scan attempt blocked",
    );
    this.writeAudit(user.id, qrAgencyId, "cross_agency_scan_attempt", null, {
      userAgency: user.agencyId,
      tokenPrefix: token.slice(0, 6),
    });
    throw new CrossAgencyScanException();
  }

  private async enqueueScanLog(
    payload: QrCachePayload,
    user: RequestUser,
    dto: QrLookupDto,
    scannedAt: string,
  ): Promise<void> {
    const jobData: ScanLogJobData = {
      agencyId: payload.agencyId,
      pilgrimId: payload.pilgrimId,
      scannedByUserId: user.id,
      qrToken: dto.token,
      scannedAt,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      deviceId: dto.deviceId,
      wasOffline: false,
    };
    await this.scanLogs.enqueue(jobData);
  }

  private toResponse(
    p: QrCachePayload,
    scannedAt: string,
    cached: boolean,
  ): QrLookupResponse {
    return {
      pilgrimId: p.pilgrimId,
      fullName: p.fullName,
      passportNo: p.passportNo,
      nationality: p.nationality,
      gender: p.gender,
      status: p.status,
      photoUrl: p.photoUrl,
      groupName: p.groupName,
      emergencyContact: p.emergencyContact,
      scannedAt,
      cached,
    };
  }

  private errorCode(err: unknown): string {
    if (err && typeof err === "object" && "getResponse" in err) {
      const res = (err as { getResponse: () => unknown }).getResponse();
      if (res && typeof res === "object" && "error" in res) {
        return String((res as { error: unknown }).error);
      }
    }
    return "UNKNOWN_ERROR";
  }

  private writeAudit(
    userId: string,
    agencyId: string,
    action: string,
    entityId: string | null,
    after: Record<string, unknown> | null = null,
  ): void {
    db.insert(auditLogs)
      .values({
        agencyId,
        userId,
        action,
        entityType: "qr",
        entityId,
        after,
      })
      .catch((err: unknown) => {
        this.logger.warn({ err, action }, "qr audit insert failed");
      });
  }
}

// 32 bytes → 43 base64url chars (no padding).
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}
