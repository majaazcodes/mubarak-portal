export const USER_ROLES = ['super_admin', 'agency_admin', 'operator', 'viewer'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const isUserRole = (value: string): value is UserRole =>
  (USER_ROLES as readonly string[]).includes(value);
