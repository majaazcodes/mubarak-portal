import { Injectable, Logger } from "@nestjs/common";
import { db } from "../../db/client";
import { auditLogs } from "../../db/schema";
import { CacheService } from "../../common/services/cache.service";
import {
  GroupHasPilgrimsException,
  GroupNotFoundException,
} from "../../common/exceptions/app.exceptions";
import type { Group } from "../../db/types";
import type { CreateGroupDto } from "./dto/create-group.dto";
import type { UpdateGroupDto } from "./dto/update-group.dto";
import type { GroupWithPilgrimCount } from "./dto/list-groups.dto";
import { GroupsRepository } from "./groups.repository";

const CACHE_TTL_SEC = 60;

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private readonly repo: GroupsRepository,
    private readonly cache: CacheService,
  ) {}

  async listForAgency(agencyId: string): Promise<GroupWithPilgrimCount[]> {
    const cacheKey = `groups:${agencyId}`;
    const cached = await this.cache.get<GroupWithPilgrimCount[]>(cacheKey);
    if (cached) return cached;
    const rows = await this.repo.listByAgency(agencyId);
    await this.cache.set(cacheKey, rows, CACHE_TTL_SEC);
    return rows;
  }

  async getById(id: string, agencyId: string): Promise<Group> {
    const group = await this.repo.findByIdInAgency(id, agencyId);
    if (!group) throw new GroupNotFoundException();
    return group;
  }

  async create(
    dto: CreateGroupDto,
    agencyId: string,
    userId: string,
  ): Promise<Group> {
    const group = await this.repo.create({
      agencyId,
      name: dto.name,
      leaderUserId: dto.leaderUserId ?? null,
      departureDate: dto.departureDate ?? null,
      returnDate: dto.returnDate ?? null,
      maxSize: dto.maxSize ?? 50,
      notes: dto.notes ?? null,
    });
    await this.cache.del(`groups:${agencyId}`);
    await this.writeAudit(userId, agencyId, "create", group.id, null, group);
    return group;
  }

  async update(
    id: string,
    dto: UpdateGroupDto,
    agencyId: string,
    userId: string,
  ): Promise<Group> {
    const before = await this.repo.findByIdInAgency(id, agencyId);
    if (!before) throw new GroupNotFoundException();

    const patch: Partial<Group> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.leaderUserId !== undefined) patch.leaderUserId = dto.leaderUserId;
    if (dto.departureDate !== undefined)
      patch.departureDate = dto.departureDate;
    if (dto.returnDate !== undefined) patch.returnDate = dto.returnDate;
    if (dto.maxSize !== undefined) patch.maxSize = dto.maxSize;
    if (dto.notes !== undefined) patch.notes = dto.notes;

    const after = await this.repo.update(id, agencyId, patch);
    if (!after) throw new GroupNotFoundException();

    await this.cache.del(`groups:${agencyId}`);
    await this.writeAudit(userId, agencyId, "update", id, before, after);
    return after;
  }

  async delete(id: string, agencyId: string, userId: string): Promise<void> {
    const before = await this.repo.findByIdInAgency(id, agencyId);
    if (!before) throw new GroupNotFoundException();

    const pilgrimCount = await this.repo.countPilgrims(id);
    if (pilgrimCount > 0) throw new GroupHasPilgrimsException(pilgrimCount);

    const deleted = await this.repo.delete(id, agencyId);
    if (!deleted) throw new GroupNotFoundException();

    await this.cache.del(`groups:${agencyId}`);
    await this.writeAudit(userId, agencyId, "delete", id, before, null);
  }

  private async writeAudit(
    userId: string,
    agencyId: string,
    action: "create" | "update" | "delete",
    entityId: string,
    before: Group | null,
    after: Group | null,
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        agencyId,
        userId,
        action,
        entityType: "group",
        entityId,
        before: before ? (before as unknown as Record<string, unknown>) : null,
        after: after ? (after as unknown as Record<string, unknown>) : null,
      });
    } catch (err) {
      this.logger.error({ err, action, entityId }, "group audit insert failed");
    }
  }
}
