import { Injectable, type OnModuleInit } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { pilgrims, qrCodes } from "../../db/schema";
import type { NewQrCode, QrCode } from "../../db/types";

export interface QrLookupRow {
  qrId: string;
  token: string;
  version: number;
  revokedAt: Date | null;
  pilgrimId: string;
  agencyId: string;
  fullName: string;
  passportNo: string;
  nationality: string | null;
  gender: "male" | "female";
  status: "pending" | "active" | "completed" | "issue";
  photoUrl: string | null;
  emergencyContact: unknown;
  groupName: string | null;
  deletedAt: Date | null;
}

@Injectable()
export class QrRepository implements OnModuleInit {
  // Prepared statement name bumped when schema/columns change (e.g. qr_lookup_v2)
  private lookupStmt = db
    .select({
      qrId: qrCodes.id,
      token: qrCodes.token,
      version: qrCodes.version,
      revokedAt: qrCodes.revokedAt,
      pilgrimId: pilgrims.id,
      agencyId: pilgrims.agencyId,
      fullName: pilgrims.fullName,
      passportNo: pilgrims.passportNo,
      nationality: pilgrims.nationality,
      gender: pilgrims.gender,
      status: pilgrims.status,
      photoUrl: pilgrims.photoUrl,
      emergencyContact: pilgrims.emergencyContact,
      deletedAt: pilgrims.deletedAt,
      // Correlated LATERAL subquery avoids row multiplication from the
      // M:N pilgrim_groups join. Returns the earliest-assigned group name.
      groupName: sql<string | null>`(
        SELECT g.name
        FROM pilgrim_groups pg
        JOIN groups g ON g.id = pg.group_id
        WHERE pg.pilgrim_id = ${pilgrims.id}
        ORDER BY pg.assigned_at ASC
        LIMIT 1
      )`.as("group_name"),
    })
    .from(qrCodes)
    .innerJoin(pilgrims, eq(pilgrims.id, qrCodes.pilgrimId))
    .where(eq(qrCodes.token, sql.placeholder("token")))
    .limit(1)
    .prepare("qr_lookup_v1");

  async onModuleInit(): Promise<void> {
    // Warm prepare cache so first real scan doesn't pay the PREPARE cost.
    try {
      await this.lookupStmt.execute({ token: "0".repeat(43) });
    } catch {
      // warmup failures are non-fatal
    }
  }

  async lookupByToken(token: string): Promise<QrLookupRow | null> {
    const rows = (await this.lookupStmt.execute({ token })) as QrLookupRow[];
    return rows[0] ?? null;
  }

  async findByPilgrim(pilgrimId: string): Promise<QrCode | null> {
    const rows = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.pilgrimId, pilgrimId))
      .limit(1);
    return rows[0] ?? null;
  }

  async findActiveByPilgrim(pilgrimId: string): Promise<QrCode | null> {
    const rows = await db
      .select()
      .from(qrCodes)
      .where(and(eq(qrCodes.pilgrimId, pilgrimId), isNull(qrCodes.revokedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async insert(input: NewQrCode): Promise<QrCode> {
    const [row] = await db.insert(qrCodes).values(input).returning();
    if (!row) throw new Error("qr insert returned no row");
    return row;
  }

  async revokeByPilgrim(pilgrimId: string): Promise<void> {
    await db
      .update(qrCodes)
      .set({ revokedAt: new Date() })
      .where(and(eq(qrCodes.pilgrimId, pilgrimId), isNull(qrCodes.revokedAt)));
  }

  async replaceForPilgrim(
    pilgrimId: string,
    newToken: string,
    newVersion: number,
  ): Promise<QrCode> {
    // qr_codes.pilgrim_id has a unique constraint, so regeneration means
    // delete-then-insert inside a transaction. History lives in audit_logs.
    return await db.transaction(async (tx) => {
      await tx.delete(qrCodes).where(eq(qrCodes.pilgrimId, pilgrimId));
      const [row] = await tx
        .insert(qrCodes)
        .values({ pilgrimId, token: newToken, version: newVersion })
        .returning();
      if (!row) throw new Error("qr regenerate insert returned no row");
      return row;
    });
  }
}
