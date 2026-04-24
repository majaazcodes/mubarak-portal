"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchGroups } from "@/lib/api/groups";
import type { GroupListResponse } from "@/lib/types/group";

const GROUPS_STALE_MS = 60_000;

export function useGroups() {
  return useQuery<GroupListResponse>({
    queryKey: ["groups"],
    queryFn: fetchGroups,
    staleTime: GROUPS_STALE_MS,
  });
}
