import { sql } from "drizzle-orm";
import {
  char,
  customType,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { agencies } from "./agencies";

export const gender = pgEnum("gender", ["male", "female"]);
export const pilgrimStatus = pgEnum("pilgrim_status", [
  "pending",
  "active",
  "completed",
  "issue",
]);

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface PilgrimTravel {
  flightNo?: string;
  arrivalDate?: string;
  hotelName?: string;
}

export const pilgrims = pgTable(
  "pilgrims",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    passportNo: varchar("passport_no", { length: 20 }).notNull(),
    nationalId: varchar("national_id", { length: 20 }),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    dob: date("dob"),
    gender: gender("gender").notNull(),
    nationality: char("nationality", { length: 2 }),
    photoUrl: text("photo_url"),
    emergencyContact: jsonb("emergency_contact").$type<EmergencyContact>(),
    travel: jsonb("travel").$type<PilgrimTravel>(),
    status: pilgrimStatus("status").notNull().default("pending"),
    notes: text("notes"),
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(full_name, '') || ' ' || coalesce(passport_no, '') || ' ' || coalesce(national_id, ''))`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    ixAgencyStatus: index("ix_pilgrims_agency_status")
      .on(t.agencyId, t.status)
      .where(sql`${t.deletedAt} IS NULL`),
    ixPassport: index("ix_pilgrims_passport").on(t.passportNo),
    ixNationalId: index("ix_pilgrims_national_id").on(t.nationalId),
    ixSearchTsv: index("ix_pilgrims_search_tsv").using("gin", t.searchTsv),
    uqAgencyPassport: uniqueIndex("uq_pilgrims_agency_passport")
      .on(t.agencyId, t.passportNo)
      .where(sql`${t.deletedAt} IS NULL`),
  }),
);
