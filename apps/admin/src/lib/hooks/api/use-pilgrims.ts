"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchPilgrims } from "@/lib/api/pilgrims";
import type {
  PilgrimListFilters,
  PilgrimListResponse,
} from "@/lib/types/pilgrim";

const LIST_STALE_MS = 30_000; // matches backend cache TTL

export function usePilgrims(filters: PilgrimListFilters) {
  return useQuery<PilgrimListResponse>({
    queryKey: ["pilgrims", filters],
    queryFn: () => fetchPilgrims(filters),
    staleTime: LIST_STALE_MS,
    // Keep the previous page visible while a new one loads so the table
    // doesn't flash empty on pagination/search changes.
    placeholderData: keepPreviousData,
  });
}
