// Re-export shared types so screen code imports from one local module — easier
// to swap if the shared package is ever consumed under a different alias.
export type {
  User,
  LoginResponse,
  RefreshResponse,
  UserRole,
} from "@hajj/shared-types";

export interface ApiError {
  error: string;
  message: string;
}

export interface PilgrimsListResponse {
  total: number;
  // The list payload is bigger than this; the dashboard only reads `total`,
  // so we keep the shape narrow on purpose to avoid coupling.
}

export interface GroupListItem {
  id: string;
  name: string;
}

export interface GroupsListResponse {
  items: GroupListItem[];
}
