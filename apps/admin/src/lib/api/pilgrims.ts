import type {
  CreatePilgrimInput,
  CreatePilgrimResponse,
  PilgrimDetail,
  PilgrimListFilters,
  PilgrimListResponse,
  UpdatePilgrimInput,
} from "@/lib/types/pilgrim";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
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

export async function fetchPilgrim(id: string): Promise<PilgrimDetail> {
  return apiGet<PilgrimDetail>(PILGRIMS.byId(id));
}

export async function createPilgrim(
  input: CreatePilgrimInput,
): Promise<CreatePilgrimResponse> {
  return apiPost<CreatePilgrimResponse, CreatePilgrimInput>(
    PILGRIMS.list,
    input,
  );
}

export async function updatePilgrim(
  id: string,
  input: UpdatePilgrimInput,
): Promise<PilgrimDetail> {
  return apiPatch<PilgrimDetail, UpdatePilgrimInput>(PILGRIMS.byId(id), input);
}

export async function deletePilgrim(id: string): Promise<void> {
  // Backend responds 204 No Content; body isn't consumed, so `unknown` is
  // the accurate generic (`void` isn't valid as a type-arg in this lint rule).
  await apiDelete<unknown>(PILGRIMS.byId(id));
}
