"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPilgrim } from "@/lib/api/pilgrims";
import type { PilgrimDetail } from "@/lib/types/pilgrim";

const DETAIL_STALE_MS = 60_000;

export function usePilgrim(id: string | null | undefined) {
  return useQuery<PilgrimDetail>({
    queryKey: ["pilgrim", id],
    queryFn: () => {
      if (!id) throw new Error("usePilgrim called without id");
      return fetchPilgrim(id);
    },
    enabled: Boolean(id),
    staleTime: DETAIL_STALE_MS,
  });
}
