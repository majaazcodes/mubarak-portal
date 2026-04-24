import type { UserRole } from "./roles";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  agencyId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
