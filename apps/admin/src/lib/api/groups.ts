import type {
  CreateGroupInput,
  GroupListResponse,
  GroupWithPilgrimCount,
  UpdateGroupInput,
} from "@/lib/types/group";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import { GROUPS } from "./endpoints";

export async function fetchGroups(): Promise<GroupListResponse> {
  return apiGet<GroupListResponse>(GROUPS.list);
}

export async function fetchGroup(id: string): Promise<GroupWithPilgrimCount> {
  return apiGet<GroupWithPilgrimCount>(GROUPS.byId(id));
}

export async function createGroup(
  input: CreateGroupInput,
): Promise<GroupWithPilgrimCount> {
  return apiPost<GroupWithPilgrimCount, CreateGroupInput>(GROUPS.list, input);
}

export async function updateGroup(
  id: string,
  input: UpdateGroupInput,
): Promise<GroupWithPilgrimCount> {
  return apiPatch<GroupWithPilgrimCount, UpdateGroupInput>(
    GROUPS.byId(id),
    input,
  );
}

export async function deleteGroup(id: string): Promise<void> {
  await apiDelete<unknown>(GROUPS.byId(id));
}
