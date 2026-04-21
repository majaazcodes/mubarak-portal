import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { groups } from "./groups";
import { pilgrims } from "./pilgrims";

export const pilgrimGroups = pgTable(
  "pilgrim_groups",
  {
    pilgrimId: uuid("pilgrim_id")
      .notNull()
      .references(() => pilgrims.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.pilgrimId, t.groupId] }),
    ixGroup: index("ix_pilgrim_groups_group").on(t.groupId),
  }),
);
