import { Injectable } from "@nestjs/common";
import { and, eq, sql as dsql } from "drizzle-orm";
import { db } from "../../db/client";
import { agencies, users } from "../../db/schema";
import type { User } from "../../db/types";

export interface UserWithAgencyStatus extends User {
  agencyStatus: "active" | "suspended" | "archived" | null;
}

@Injectable()
export class UsersRepository {
  async findByEmailLower(email: string): Promise<UserWithAgencyStatus | null> {
    const rows = await db
      .select({
        id: users.id,
        agencyId: users.agencyId,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        fullName: users.fullName,
        phone: users.phone,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        agencyStatus: agencies.status,
      })
      .from(users)
      .leftJoin(agencies, eq(agencies.id, users.agencyId))
      .where(dsql`lower(${users.email}) = lower(${email})`)
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return row;
  }

  async findById(id: string): Promise<UserWithAgencyStatus | null> {
    const rows = await db
      .select({
        id: users.id,
        agencyId: users.agencyId,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        fullName: users.fullName,
        phone: users.phone,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        agencyStatus: agencies.status,
      })
      .from(users)
      .leftJoin(agencies, eq(agencies.id, users.agencyId))
      .where(eq(users.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return row;
  }

  async updateLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(and(eq(users.id, id)));
  }
}
