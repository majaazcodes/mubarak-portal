import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { agencies } from "./agencies";

export const userRole = pgEnum("user_role", [
  "super_admin",
  "agency_admin",
  "operator",
  "viewer",
]);
export const userStatus = pgEnum("user_status", ["active", "disabled"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    agencyId: uuid("agency_id").references(() => agencies.id, {
      onDelete: "restrict",
    }),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: userRole("role").notNull(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    status: userStatus("status").notNull().default("active"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uqEmailLower: uniqueIndex("uq_users_email_lower").on(
      sql`lower(${t.email})`,
    ),
    ixAgencyRole: index("ix_users_agency_role").on(t.agencyId, t.role),
    roleAgencyCk: check(
      "users_role_agency_ck",
      sql`(${t.role} = 'super_admin' AND ${t.agencyId} IS NULL) OR (${t.role} <> 'super_admin' AND ${t.agencyId} IS NOT NULL)`,
    ),
  }),
);
