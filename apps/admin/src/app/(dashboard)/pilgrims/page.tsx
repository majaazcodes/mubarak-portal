"use client";

import { useState } from "react";
import { EmptyPilgrims } from "@/components/empty-states/empty-pilgrims";
import { EmptySearchResults } from "@/components/empty-states/empty-search-results";
import { ErrorState } from "@/components/empty-states/error-state";
import { BulkImportDialog } from "@/components/pilgrims/bulk-import-dialog";
import { DeletePilgrimDialog } from "@/components/pilgrims/delete-pilgrim-dialog";
import { PilgrimDetailDrawer } from "@/components/pilgrims/pilgrim-detail-drawer";
import { PilgrimEditDialogLoader } from "@/components/pilgrims/pilgrim-edit-loader";
import { PilgrimFormDialog } from "@/components/pilgrims/pilgrim-form-dialog";
import { PilgrimsPagination } from "@/components/pilgrims/pilgrims-pagination";
import { PilgrimsTable } from "@/components/pilgrims/pilgrims-table";
import { PilgrimsToolbar } from "@/components/pilgrims/pilgrims-toolbar";
import { useGroups } from "@/lib/hooks/api/use-groups";
import { usePilgrims } from "@/lib/hooks/api/use-pilgrims";
import { useQueryParams } from "@/lib/hooks/use-query-params";
import type { PilgrimDetail, PilgrimStatus } from "@/lib/types/pilgrim";

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

// Edit opens one of two ways:
//  - from the drawer — we already have the full PilgrimDetail in hand
//  - from a row's ... menu — we only have list data, so we fetch first
type FormState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit-fetching"; id: string; fullName: string }
  | { kind: "edit-ready"; pilgrim: PilgrimDetail };

export default function PilgrimsPage() {
  const { params, set } = useQueryParams();

  const page = clampInt(params.page, 1, 10_000, 1);
  const limit = clampInt(params.limit, 1, 100, DEFAULT_LIMIT);
  const search = params.search ?? "";
  const groupId = params.groupId;
  const status = parseStatus(params.status);

  const pilgrims = usePilgrims({ page, limit, search, groupId, status });
  const groups = useGroups();

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({ kind: "closed" });
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    fullName: string;
  } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const hasFilters = Boolean(search || groupId || status);
  const clearFilters = () =>
    set({
      search: undefined,
      groupId: undefined,
      status: undefined,
      page: "1",
    });

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
        onAdd={() => setFormState({ kind: "create" })}
        onImport={() => setImportOpen(true)}
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
          <EmptyPilgrims
            onAdd={() => setFormState({ kind: "create" })}
            onImport={() => setImportOpen(true)}
          />
        )
      ) : (
        <>
          <PilgrimsTable
            rows={pilgrims.data?.items ?? []}
            isLoading={pilgrims.isLoading}
            isFetching={pilgrims.isFetching}
            onRowClick={(id) => setDrawerId(id)}
            onEdit={(row) =>
              setFormState({
                kind: "edit-fetching",
                id: row.id,
                fullName: row.fullName,
              })
            }
            onDelete={(row) =>
              setDeleteTarget({ id: row.id, fullName: row.fullName })
            }
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

      <PilgrimDetailDrawer
        pilgrimId={drawerId}
        open={drawerId !== null}
        onOpenChange={(o) => !o && setDrawerId(null)}
        onEdit={(p) => {
          setDrawerId(null);
          setFormState({ kind: "edit-ready", pilgrim: p });
        }}
        onDelete={(p) => {
          setDrawerId(null);
          setDeleteTarget({ id: p.id, fullName: p.fullName });
        }}
      />

      {formState.kind === "create" && (
        <PilgrimFormDialog
          open
          mode={{ kind: "create" }}
          onOpenChange={(o) => !o && setFormState({ kind: "closed" })}
        />
      )}
      {formState.kind === "edit-fetching" && (
        <PilgrimEditDialogLoader
          id={formState.id}
          fallbackName={formState.fullName}
          onClose={() => setFormState({ kind: "closed" })}
        />
      )}
      {formState.kind === "edit-ready" && (
        <PilgrimFormDialog
          open
          mode={{ kind: "edit", pilgrim: formState.pilgrim }}
          onOpenChange={(o) => !o && setFormState({ kind: "closed" })}
        />
      )}

      <DeletePilgrimDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />

      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
