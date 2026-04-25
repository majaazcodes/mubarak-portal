import { apiGet } from "./client";
import type { GroupsListResponse, PilgrimsListResponse } from "../types";

// limit=1 is a cheap way to get the agency's total without paying for a
// 50-row payload — we only render the count on the dashboard.
export async function fetchPilgrimsTotal(): Promise<number> {
  const res = await apiGet<PilgrimsListResponse>("/pilgrims?limit=1");
  return res.total;
}

export async function fetchGroupsCount(): Promise<number> {
  const res = await apiGet<GroupsListResponse>("/groups");
  return res.items.length;
}
