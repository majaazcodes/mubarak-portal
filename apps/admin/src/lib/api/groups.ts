import type { GroupListResponse } from "@/lib/types/group";
import { apiGet } from "./client";
import { GROUPS } from "./endpoints";

export async function fetchGroups(): Promise<GroupListResponse> {
  return apiGet<GroupListResponse>(GROUPS.list);
}
