import type {
  PilgrimListFilters,
  PilgrimListResponse,
} from "@/lib/types/pilgrim";
import { apiGet } from "./client";
import { PILGRIMS } from "./endpoints";

export async function fetchPilgrims(
  filters: PilgrimListFilters,
): Promise<PilgrimListResponse> {
  const params: Record<string, string> = {};
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.search) params.search = filters.search;
  if (filters.groupId) params.groupId = filters.groupId;
  if (filters.status) params.status = filters.status;
  return apiGet<PilgrimListResponse>(PILGRIMS.list, { params });
}
