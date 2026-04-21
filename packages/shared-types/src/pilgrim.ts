export const PILGRIM_STATUSES = [
  'registered',
  'visa_pending',
  'visa_approved',
  'traveled',
  'in_makkah',
  'in_madinah',
  'completed',
  'cancelled',
] as const;

export type PilgrimStatus = (typeof PILGRIM_STATUSES)[number];

export const isPilgrimStatus = (value: string): value is PilgrimStatus =>
  (PILGRIM_STATUSES as readonly string[]).includes(value);
