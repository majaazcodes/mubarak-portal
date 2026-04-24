"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchGroup } from "@/lib/api/groups";
import type { GroupWithPilgrimCount } from "@/lib/types/group";

export function useGroup(id: string | null | undefined) {
  return useQuery<GroupWithPilgrimCount>({
    queryKey: ["group", id],
    queryFn: () => {
      if (!id) throw new Error("useGroup called without id");
      return fetchGroup(id);
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
