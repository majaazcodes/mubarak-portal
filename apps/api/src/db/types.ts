import type {
  agencies,
  agencyPlan,
  agencyStatus,
  auditLogs,
  gender,
  groups,
  pilgrimGroups,
  pilgrimStatus,
  pilgrims,
  qrCodes,
  scanLogs,
  userRole,
  users,
  userStatus,
} from "./schema";

export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;

export type Pilgrim = typeof pilgrims.$inferSelect;
export type NewPilgrim = typeof pilgrims.$inferInsert;

export type PilgrimGroup = typeof pilgrimGroups.$inferSelect;
export type NewPilgrimGroup = typeof pilgrimGroups.$inferInsert;

export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;

export type ScanLog = typeof scanLogs.$inferSelect;
export type NewScanLog = typeof scanLogs.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type AgencyPlan = (typeof agencyPlan.enumValues)[number];
export type AgencyStatus = (typeof agencyStatus.enumValues)[number];
export type UserRole = (typeof userRole.enumValues)[number];
export type UserStatus = (typeof userStatus.enumValues)[number];
export type Gender = (typeof gender.enumValues)[number];
export type PilgrimStatus = (typeof pilgrimStatus.enumValues)[number];

export type { EmergencyContact, PilgrimTravel } from "./schema/pilgrims";
