import type { User } from "@hajj/shared-types";
import { apiGet } from "./client";
import { AUTH } from "./endpoints";

export async function fetchCurrentUser(): Promise<User> {
  return apiGet<User>(AUTH.me);
}
