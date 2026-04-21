import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { agencies } from "./agencies";
import { users } from "./users";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 50 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: varchar("ip", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    ixAgencyCreated: index("ix_audit_logs_agency_created").on(
      t.agencyId,
      sql`${t.createdAt} DESC`,
    ),
    ixEntity: index("ix_audit_logs_entity").on(t.entityType, t.entityId),
    ixUserCreated: index("ix_audit_logs_user_created").on(
      t.userId,
      sql`${t.createdAt} DESC`,
    ),
  }),
);
