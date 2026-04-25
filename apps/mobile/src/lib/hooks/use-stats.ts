import { useQuery } from "@tanstack/react-query";
import { fetchGroupsCount, fetchPilgrimsTotal } from "../api/stats";

export function usePilgrimsTotal() {
  return useQuery({
    queryKey: ["stats", "pilgrims-total"],
    queryFn: fetchPilgrimsTotal,
    staleTime: 5 * 60_000,
  });
}

export function useGroupsCount() {
  return useQuery({
    queryKey: ["stats", "groups-count"],
    queryFn: fetchGroupsCount,
    staleTime: 5 * 60_000,
  });
}
