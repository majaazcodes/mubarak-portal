import { sql } from "drizzle-orm";
import {
  char,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const agencyPlan = pgEnum("agency_plan", [
  "trial",
  "standard",
  "enterprise",
]);
export const agencyStatus = pgEnum("agency_status", [
  "active",
  "suspended",
  "archived",
]);

export const agencies = pgTable(
  "agencies",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 200 }).notNull(),
    country: char("country", { length: 2 }).notNull(),
    contactEmail: varchar("contact_email", { length: 255 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 20 }),
    plan: agencyPlan("plan").notNull().default("trial"),
    status: agencyStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uqNameCountry: uniqueIndex("uq_agencies_name_country").on(
      t.name,
      t.country,
    ),
    ixStatus: index("ix_agencies_status").on(t.status),
  }),
);
