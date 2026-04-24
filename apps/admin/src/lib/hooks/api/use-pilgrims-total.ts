"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPilgrims } from "@/lib/api/pilgrims";

// Cheap count query — limit=1 so we only pull a single row but still get the
// `total` field from the paginated envelope. Cached for 5 min since dashboard
// visits are frequent but the number rarely changes that fast.
export function usePilgrimsTotal() {
  return useQuery({
    queryKey: ["pilgrims-total"],
    queryFn: () => fetchPilgrims({ limit: 1 }).then((r) => r.total),
    staleTime: 5 * 60_000,
  });
}
