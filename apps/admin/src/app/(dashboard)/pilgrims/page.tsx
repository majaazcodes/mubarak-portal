"use client";

import { toast } from "sonner";
import { EmptyPilgrims } from "@/components/empty-states/empty-pilgrims";
import { EmptySearchResults } from "@/components/empty-states/empty-search-results";
import { ErrorState } from "@/components/empty-states/error-state";
import { PilgrimsPagination } from "@/components/pilgrims/pilgrims-pagination";
import { PilgrimsTable } from "@/components/pilgrims/pilgrims-table";
import { PilgrimsToolbar } from "@/components/pilgrims/pilgrims-toolbar";
import { useGroups } from "@/lib/hooks/api/use-groups";
import { usePilgrims } from "@/lib/hooks/api/use-pilgrims";
import { useQueryParams } from "@/lib/hooks/use-query-params";
import type { PilgrimStatus } from "@/lib/types/pilgrim";

const DEFAULT_LIMIT = 20;

function clampInt(
  v: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function parseStatus(v: string | undefined): PilgrimStatus | undefined {
  if (v === "pending" || v === "active" || v === "completed" || v === "issue") {
    return v;
  }
  return undefined;
}

export default function PilgrimsPage() {
  const { params, set } = useQueryParams();

  const page = clampInt(params.page, 1, 10_000, 1);
  const limit = clampInt(params.limit, 1, 100, DEFAULT_LIMIT);
  const search = params.search ?? "";
  const groupId = params.groupId;
  const status = parseStatus(params.status);

  const pilgrims = usePilgrims({ page, limit, search, groupId, status });
  const groups = useGroups();

  const hasFilters = Boolean(search || groupId || status);

  const clearFilters = () =>
    set({
      search: undefined,
      groupId: undefined,
      status: undefined,
      page: "1",
    });

  const onAdd = () =>
    toast.info("Add pilgrim form lands in the next commit (E2).");
  const onImport = () =>
    toast.info("Bulk import lands in the next commit (E2).");
  const onRowClick = () =>
    toast.info("Pilgrim detail drawer lands in the next commit (E2).");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pilgrims</h1>
        <p className="text-muted-foreground">
          Manage your pilgrim roster — list, search, import.
        </p>
      </div>

      <PilgrimsToolbar
        search={search}
        onSearchChange={(v) => set({ search: v || undefined, page: "1" })}
        groupId={groupId}
        onGroupChange={(v) => set({ groupId: v, page: "1" })}
        status={status}
        onStatusChange={(v) => set({ status: v, page: "1" })}
        groups={groups.data?.items ?? []}
        groupsLoading={groups.isLoading}
        onAdd={onAdd}
        onImport={onImport}
      />

      {pilgrims.isError ? (
        <ErrorState
          title="Failed to load pilgrims"
          onRetry={() => void pilgrims.refetch()}
        />
      ) : !pilgrims.isLoading && (pilgrims.data?.total ?? 0) === 0 ? (
        hasFilters ? (
          <EmptySearchResults query={search} onClear={clearFilters} />
        ) : (
          <EmptyPilgrims onAdd={onAdd} onImport={onImport} />
        )
      ) : (
        <>
          <PilgrimsTable
            rows={pilgrims.data?.items ?? []}
            isLoading={pilgrims.isLoading}
            isFetching={pilgrims.isFetching}
            onRowClick={onRowClick}
          />
          <PilgrimsPagination
            page={pilgrims.data?.page ?? page}
            limit={pilgrims.data?.limit ?? limit}
            totalPages={pilgrims.data?.totalPages ?? 1}
            total={pilgrims.data?.total ?? 0}
            onPageChange={(p) => set({ page: String(p) })}
            onLimitChange={(l) => set({ limit: String(l), page: "1" })}
          />
        </>
      )}
    </div>
  );
}
