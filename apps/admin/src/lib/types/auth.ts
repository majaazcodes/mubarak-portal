// Re-export shared types + any admin-only shapes.
export type {
  User,
  UserRole,
  LoginResponse,
  RefreshResponse,
} from "@hajj/shared-types";

export interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}
