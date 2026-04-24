import { Injectable } from "@nestjs/common";
import { and, count, desc, eq, isNull, sql as dsql } from "drizzle-orm";
import { db } from "../../db/client";
import { groups, pilgrimGroups, pilgrims } from "../../db/schema";
import type {
  EmergencyContact,
  NewPilgrim,
  Pilgrim,
  PilgrimTravel,
} from "../../db/types";
import type {
  PilgrimListItem,
  PilgrimWithGroups,
} from "./dto/pilgrim-summary.dto";

export interface ListFilters {
  agencyId: string;
  page: number;
  limit: number;
  search?: string | undefined;
  groupId?: string | undefined;
  status?: "pending" | "active" | "completed" | "issue" | undefined;
}

@Injectable()
export class PilgrimsRepository {
  async list(
    filters: ListFilters,
  ): Promise<{ items: PilgrimListItem[]; total: number }> {
    const where = this.buildWhere(filters);

    const itemsQuery = filters.groupId
      ? db
          .select({
            id: pilgrims.id,
            fullName: pilgrims.fullName,
            passportNo: pilgrims.passportNo,
            nationality: pilgrims.nationality,
            dob: pilgrims.dob,
            gender: pilgrims.gender,
            status: pilgrims.status,
            createdAt: pilgrims.createdAt,
          })
          .from(pilgrims)
          .innerJoin(pilgrimGroups, eq(pilgrimGroups.pilgrimId, pilgrims.id))
          .where(where)
          .orderBy(desc(pilgrims.createdAt))
          .limit(filters.limit)
          .offset((filters.page - 1) * filters.limit)
      : db
          .select({
            id: pilgrims.id,
            fullName: pilgrims.fullName,
            passportNo: pilgrims.passportNo,
            nationality: pilgrims.nationality,
            dob: pilgrims.dob,
            gender: pilgrims.gender,
            status: pilgrims.status,
            createdAt: pilgrims.createdAt,
          })
          .from(pilgrims)
          .where(where)
          .orderBy(desc(pilgrims.createdAt))
          .limit(filters.limit)
          .offset((filters.page - 1) * filters.limit);

    const countQuery = filters.groupId
      ? db
          .select({ n: count() })
          .from(pilgrims)
          .innerJoin(pilgrimGroups, eq(pilgrimGroups.pilgrimId, pilgrims.id))
          .where(where)
      : db.select({ n: count() }).from(pilgrims).where(where);

    const [items, countRows] = await Promise.all([itemsQuery, countQuery]);
    const total = countRows[0]?.n ?? 0;
    return { items, total };
  }

  private buildWhere(filters: ListFilters): ReturnType<typeof and> {
    const clauses = [
      eq(pilgrims.agencyId, filters.agencyId),
      isNull(pilgrims.deletedAt),
    ];
    if (filters.status) {
      clauses.push(eq(pilgrims.status, filters.status));
    }
    if (filters.groupId) {
      clauses.push(eq(pilgrimGroups.groupId, filters.groupId));
    }
    if (filters.search && filters.search.trim().length > 0) {
      const query = filters.search
        .trim()
        .replace(/[^A-Za-z0-9_\s]/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => `${w}:*`)
        .join(" & ");
      if (query) {
        clauses.push(
          dsql`${pilgrims.searchTsv} @@ to_tsquery('simple', ${query})`,
        );
      }
    }
    return and(...clauses);
  }

  async findByIdInAgency(
    id: string,
    agencyId: string,
  ): Promise<PilgrimWithGroups | null> {
    const rows = await db
      .select()
      .from(pilgrims)
      .where(
        and(
          eq(pilgrims.id, id),
          eq(pilgrims.agencyId, agencyId),
          isNull(pilgrims.deletedAt),
        ),
      )
      .limit(1);
    const pilgrim = rows[0];
    if (!pilgrim) return null;

    const groupRows = await db
      .select({ id: groups.id, name: groups.name })
      .from(pilgrimGroups)
      .innerJoin(groups, eq(groups.id, pilgrimGroups.groupId))
      .where(eq(pilgrimGroups.pilgrimId, id));

    return {
      ...pilgrim,
      groups: groupRows,
      emergencyContact: pilgrim.emergencyContact as EmergencyContact | null,
      travel: pilgrim.travel as PilgrimTravel | null,
    };
  }

  async existsByPassport(
    agencyId: string,
    passportNo: string,
    excludeId?: string,
  ): Promise<boolean> {
    const clauses = [
      eq(pilgrims.agencyId, agencyId),
      eq(pilgrims.passportNo, passportNo),
      isNull(pilgrims.deletedAt),
    ];
    const rows = await db
      .select({ id: pilgrims.id })
      .from(pilgrims)
      .where(and(...clauses))
      .limit(1);
    if (rows.length === 0) return false;
    if (excludeId && rows[0]?.id === excludeId) return false;
    return true;
  }

  async create(input: NewPilgrim, groupIds: string[] = []): Promise<Pilgrim> {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(pilgrims).values(input).returning();
      if (!row) throw new Error("failed to insert pilgrim");
      if (groupIds.length > 0) {
        await tx
          .insert(pilgrimGroups)
          .values(groupIds.map((gid) => ({ pilgrimId: row.id, groupId: gid })));
      }
      return row;
    });
  }

  async update(
    id: string,
    agencyId: string,
    patch: Partial<NewPilgrim>,
    groupIds?: string[],
  ): Promise<Pilgrim | null> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(pilgrims)
        .set({ ...patch, updatedAt: new Date() })
        .where(
          and(
            eq(pilgrims.id, id),
            eq(pilgrims.agencyId, agencyId),
            isNull(pilgrims.deletedAt),
          ),
        )
        .returning();
      if (!row) return null;

      if (groupIds !== undefined) {
        await tx.delete(pilgrimGroups).where(eq(pilgrimGroups.pilgrimId, id));
        if (groupIds.length > 0) {
          await tx
            .insert(pilgrimGroups)
            .values(groupIds.map((gid) => ({ pilgrimId: id, groupId: gid })));
        }
      }
      return row;
    });
  }

  async softDelete(id: string, agencyId: string): Promise<boolean> {
    const rows = await db
      .update(pilgrims)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(pilgrims.id, id),
          eq(pilgrims.agencyId, agencyId),
          isNull(pilgrims.deletedAt),
        ),
      )
      .returning({ id: pilgrims.id });
    return rows.length > 0;
  }
}
