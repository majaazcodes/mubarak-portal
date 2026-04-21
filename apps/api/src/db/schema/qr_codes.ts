import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { pilgrims } from "./pilgrims";

export const qrCodes = pgTable(
  "qr_codes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    pilgrimId: uuid("pilgrim_id")
      .notNull()
      .unique()
      .references(() => pilgrims.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 43 }).notNull(),
    version: integer("version").notNull().default(1),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    uqToken: uniqueIndex("uq_qr_codes_token").on(t.token),
  }),
);
