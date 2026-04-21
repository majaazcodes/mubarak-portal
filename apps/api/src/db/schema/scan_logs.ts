import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  doublePrecision,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { agencies } from "./agencies";
import { pilgrims } from "./pilgrims";
import { users } from "./users";

export const scanLogs = pgTable(
  "scan_logs",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    pilgrimId: uuid("pilgrim_id")
      .notNull()
      .references(() => pilgrims.id, { onDelete: "restrict" }),
    scannedByUserId: uuid("scanned_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    qrToken: varchar("qr_token", { length: 43 }).notNull(),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    deviceId: varchar("device_id", { length: 100 }),
    wasOffline: boolean("was_offline").notNull().default(false),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    ixPilgrimScanned: index("ix_scan_logs_pilgrim_scanned").on(
      t.pilgrimId,
      sql`${t.scannedAt} DESC`,
    ),
    ixAgencyScanned: index("ix_scan_logs_agency_scanned").on(
      t.agencyId,
      sql`${t.scannedAt} DESC`,
    ),
    ixUserScanned: index("ix_scan_logs_user_scanned").on(
      t.scannedByUserId,
      sql`${t.scannedAt} DESC`,
    ),
  }),
);
