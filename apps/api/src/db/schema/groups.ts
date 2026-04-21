import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { agencies } from "./agencies";
import { users } from "./users";

export const groups = pgTable(
  "groups",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 100 }).notNull(),
    leaderUserId: uuid("leader_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    departureDate: date("departure_date"),
    returnDate: date("return_date"),
    maxSize: integer("max_size").notNull().default(50),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    ixAgency: index("ix_groups_agency").on(t.agencyId),
  }),
);
