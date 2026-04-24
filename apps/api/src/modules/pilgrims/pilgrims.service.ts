import { createHash } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { db } from "../../db/client";
import { auditLogs } from "../../db/schema";
import { CacheService } from "../../common/services/cache.service";
import {
  PassportDuplicateException,
  PilgrimNotFoundException,
} from "../../common/exceptions/app.exceptions";
import type {
  EmergencyContact,
  NewPilgrim,
  Pilgrim,
  PilgrimTravel,
} from "../../db/types";
import type { CreatePilgrimDto } from "./dto/create-pilgrim.dto";
import type { UpdatePilgrimDto } from "./dto/update-pilgrim.dto";
import type { ListPilgrimsDto } from "./dto/list-pilgrims.dto";
import type {
  PilgrimListResponse,
  PilgrimWithGroups,
} from "./dto/pilgrim-summary.dto";
import { PilgrimsRepository } from "./pilgrims.repository";
import { QrService } from "../qr/qr.service";

const LIST_CACHE_TTL_SEC = 30;
const PILGRIM_CACHE_TTL_SEC = 60;

@Injectable()
export class PilgrimsService {
  private readonly logger = new Logger(PilgrimsService.name);

  constructor(
    private readonly repo: PilgrimsRepository,
    private readonly cache: CacheService,
    private readonly qr: QrService,
  ) {}

  async list(
    dto: ListPilgrimsDto,
    agencyId: string,
  ): Promise<PilgrimListResponse> {
    const page = Math.max(1, dto.page ?? 1);
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
    const filters = {
      agencyId,
      page,
      limit,
      search: dto.search,
      groupId: dto.groupId,
      status: dto.status,
    };
    const cacheKey = this.listCacheKey(agencyId, filters);
    const cached = await this.cache.get<PilgrimListResponse>(cacheKey);
    if (cached) return cached;

    const { items, total } = await this.repo.list(filters);
    const response: PilgrimListResponse = {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
    await this.cache.set(cacheKey, response, LIST_CACHE_TTL_SEC);
    return response;
  }

  async getById(
    id: string,
    agencyId: string,
    userId: string,
  ): Promise<PilgrimWithGroups> {
    const cacheKey = `pilgrim:${id}`;
    const cached = await this.cache.get<PilgrimWithGroups>(cacheKey);
    if (cached && cached.agencyId === agencyId) {
      this.auditView(userId, agencyId, id);
      return cached;
    }

    const pilgrim = await this.repo.findByIdInAgency(id, agencyId);
    if (!pilgrim) throw new PilgrimNotFoundException();

    await this.cache.set(cacheKey, pilgrim, PILGRIM_CACHE_TTL_SEC);
    this.auditView(userId, agencyId, id);
    return pilgrim;
  }

  async create(
    dto: CreatePilgrimDto,
    agencyId: string,
    userId: string,
  ): Promise<{ pilgrim: Pilgrim; qrToken: string }> {
    const exists = await this.repo.existsByPassport(agencyId, dto.passportNo);
    if (exists) throw new PassportDuplicateException(dto.passportNo);

    const input: NewPilgrim = {
      agencyId,
      passportNo: dto.passportNo.toUpperCase(),
      fullName: dto.fullName,
      dob: dto.dob,
      gender: dto.gender,
      nationality: dto.nationality ?? "IN",
      nationalId: dto.nationalId ?? null,
      emergencyContact: (dto.emergencyContact ??
        null) as EmergencyContact | null,
      travel: (dto.travel ?? null) as PilgrimTravel | null,
      notes: dto.notes ?? null,
      status: "active",
    };

    const pilgrim = await this.repo.create(input, dto.groupIds ?? []);
    const { token } = await this.qr.createForPilgrim(pilgrim.id);
    await this.cache.invalidateAgencyLists(agencyId);
    await this.writeAudit(
      userId,
      agencyId,
      "create",
      pilgrim.id,
      null,
      pilgrim,
    );
    return { pilgrim, qrToken: token };
  }

  async update(
    id: string,
    dto: UpdatePilgrimDto,
    agencyId: string,
    userId: string,
  ): Promise<Pilgrim> {
    const before = await this.repo.findByIdInAgency(id, agencyId);
    if (!before) throw new PilgrimNotFoundException();

    if (dto.passportNo && dto.passportNo.toUpperCase() !== before.passportNo) {
      const exists = await this.repo.existsByPassport(
        agencyId,
        dto.passportNo,
        id,
      );
      if (exists) throw new PassportDuplicateException(dto.passportNo);
    }

    const patch: Partial<NewPilgrim> = {};
    if (dto.passportNo !== undefined)
      patch.passportNo = dto.passportNo.toUpperCase();
    if (dto.fullName !== undefined) patch.fullName = dto.fullName;
    if (dto.dob !== undefined) patch.dob = dto.dob;
    if (dto.gender !== undefined) patch.gender = dto.gender;
    if (dto.nationality !== undefined) patch.nationality = dto.nationality;
    if (dto.nationalId !== undefined) patch.nationalId = dto.nationalId;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.emergencyContact !== undefined)
      patch.emergencyContact = dto.emergencyContact as EmergencyContact;
    if (dto.travel !== undefined) patch.travel = dto.travel as PilgrimTravel;
    if (dto.notes !== undefined) patch.notes = dto.notes;

    const after = await this.repo.update(id, agencyId, patch, dto.groupIds);
    if (!after) throw new PilgrimNotFoundException();

    await this.cache.invalidatePilgrim(id, agencyId);
    await this.writeAudit(userId, agencyId, "update", id, before, after);
    return after;
  }

  async delete(id: string, agencyId: string, userId: string): Promise<void> {
    const before = await this.repo.findByIdInAgency(id, agencyId);
    if (!before) throw new PilgrimNotFoundException();
    const ok = await this.repo.softDelete(id, agencyId);
    if (!ok) throw new PilgrimNotFoundException();
    await this.qr.revoke(id);
    await this.cache.invalidatePilgrim(id, agencyId);
    await this.writeAudit(userId, agencyId, "delete", id, before, null);
  }

  private listCacheKey(agencyId: string, filters: object): string {
    const h = createHash("sha1")
      .update(JSON.stringify(filters))
      .digest("hex")
      .slice(0, 16);
    return `pilgrims:list:${agencyId}:${h}`;
  }

  private auditView(userId: string, agencyId: string, pilgrimId: string): void {
    db.insert(auditLogs)
      .values({
        agencyId,
        userId,
        action: "view",
        entityType: "pilgrim",
        entityId: pilgrimId,
      })
      .catch((err: unknown) => {
        this.logger.warn({ err, pilgrimId }, "pilgrim view audit failed");
      });
  }

  private async writeAudit(
    userId: string,
    agencyId: string,
    action: "create" | "update" | "delete",
    entityId: string,
    before: unknown | null,
    after: unknown | null,
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        agencyId,
        userId,
        action,
        entityType: "pilgrim",
        entityId,
        before: before ? (before as Record<string, unknown>) : null,
        after: after ? (after as Record<string, unknown>) : null,
      });
    } catch (err) {
      this.logger.error(
        { err, action, entityId },
        "pilgrim audit insert failed",
      );
    }
  }
}
