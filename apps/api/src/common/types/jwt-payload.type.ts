import type { UserRole } from "../../db/types";

export interface AccessJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  agencyId: string | null;
  type: "access";
  iat?: number;
  exp?: number;
}

export interface RefreshJwtPayload {
  sub: string;
  jti: string;
  familyId: string;
  type: "refresh";
  iat?: number;
  exp?: number;
}
