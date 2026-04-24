import { Injectable } from "@nestjs/common";
import { and, count, eq, sql as dsql } from "drizzle-orm";
import { db } from "../../db/client";
import { groups, pilgrimGroups } from "../../db/schema";
import type { Group, NewGroup } from "../../db/types";
import type { GroupWithPilgrimCount } from "./dto/list-groups.dto";

@Injectable()
export class GroupsRepository {
  async listByAgency(agencyId: string): Promise<GroupWithPilgrimCount[]> {
    const rows = await db
      .select({
        id: groups.id,
        agencyId: groups.agencyId,
        name: groups.name,
        leaderUserId: groups.leaderUserId,
        departureDate: groups.departureDate,
        returnDate: groups.returnDate,
        maxSize: groups.maxSize,
        notes: groups.notes,
        createdAt: groups.createdAt,
        updatedAt: groups.updatedAt,
        pilgrimCount: dsql<number>`coalesce(count(${pilgrimGroups.pilgrimId}), 0)::int`,
      })
      .from(groups)
      .leftJoin(pilgrimGroups, eq(pilgrimGroups.groupId, groups.id))
      .where(eq(groups.agencyId, agencyId))
      .groupBy(groups.id)
      .orderBy(groups.name);
    return rows;
  }

  async findByIdInAgency(id: string, agencyId: string): Promise<Group | null> {
    const rows = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, id), eq(groups.agencyId, agencyId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async countPilgrims(groupId: string): Promise<number> {
    const [row] = await db
      .select({ n: count() })
      .from(pilgrimGroups)
      .where(eq(pilgrimGroups.groupId, groupId));
    return row?.n ?? 0;
  }

  async create(input: NewGroup): Promise<Group> {
    const [row] = await db.insert(groups).values(input).returning();
    if (!row) throw new Error("failed to insert group");
    return row;
  }

  async update(
    id: string,
    agencyId: string,
    patch: Partial<NewGroup>,
  ): Promise<Group | null> {
    const [row] = await db
      .update(groups)
      .set(patch)
      .where(and(eq(groups.id, id), eq(groups.agencyId, agencyId)))
      .returning();
    return row ?? null;
  }

  async delete(id: string, agencyId: string): Promise<boolean> {
    const rows = await db
      .delete(groups)
      .where(and(eq(groups.id, id), eq(groups.agencyId, agencyId)))
      .returning({ id: groups.id });
    return rows.length > 0;
  }
}
