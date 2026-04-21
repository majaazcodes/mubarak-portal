import type { UserRole } from "../../db/types";

export interface RequestUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  agencyId: string | null;
}
