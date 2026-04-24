"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeletePilgrimDialog } from "@/components/pilgrims/delete-pilgrim-dialog";
import { PilgrimFormDialog } from "@/components/pilgrims/pilgrim-form-dialog";
import { DeleteGroupDialog } from "@/components/groups/delete-group-dialog";
import { GroupCard } from "@/components/groups/group-card";
import { GroupDetailDrawer } from "@/components/groups/group-detail-drawer";
import { GroupFormDialog } from "@/components/groups/group-form-dialog";
import { EmptyGroups } from "@/components/empty-states/empty-groups";
import { ErrorState } from "@/components/empty-states/error-state";
import { useGroups } from "@/lib/hooks/api/use-groups";
import { useNewShortcut } from "@/lib/hooks/use-new-shortcut";
import type { GroupWithPilgrimCount } from "@/lib/types/group";
import type { PilgrimDetail } from "@/lib/types/pilgrim";

type GroupFormState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; group: GroupWithPilgrimCount };

type GroupDeleteTarget = {
  id: string;
  name: string;
  pilgrimCount: number;
} | null;

// Pilgrim dialogs can bubble up from the nested PilgrimDetailDrawer inside the
// GroupDetailDrawer (e.g. the user clicks a pilgrim in a group, then hits Edit).
type PilgrimFormState =
  | { kind: "closed" }
  | { kind: "edit"; pilgrim: PilgrimDetail };

export default function GroupsPage() {
  const groups = useGroups();

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [formState, setFormState] = useState<GroupFormState>({
    kind: "closed",
  });
  const [deleteTarget, setDeleteTarget] = useState<GroupDeleteTarget>(null);

  const [pilgrimForm, setPilgrimForm] = useState<PilgrimFormState>({
    kind: "closed",
  });
  const [pilgrimDeleteTarget, setPilgrimDeleteTarget] = useState<{
    id: string;
    fullName: string;
  } | null>(null);

  // Cmd/Ctrl+N opens the create-group dialog.
  const openCreate = useCallback(() => setFormState({ kind: "create" }), []);
  useNewShortcut(openCreate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">
            Organize pilgrims into travel groups.
          </p>
        </div>
        <Button onClick={() => setFormState({ kind: "create" })}>
          <Plus className="mr-2 h-4 w-4" aria-hidden /> Create group
        </Button>
      </div>

      {groups.isError ? (
        <ErrorState
          title="Failed to load groups"
          onRetry={() => void groups.refetch()}
        />
      ) : groups.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (groups.data?.items.length ?? 0) === 0 ? (
        <EmptyGroups onCreate={() => setFormState({ kind: "create" })} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.data?.items.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onView={(group) => setDrawerId(group.id)}
              onEdit={(group) => setFormState({ kind: "edit", group })}
              onDelete={(group) =>
                setDeleteTarget({
                  id: group.id,
                  name: group.name,
                  pilgrimCount: group.pilgrimCount,
                })
              }
            />
          ))}
        </div>
      )}

      <GroupDetailDrawer
        groupId={drawerId}
        open={drawerId !== null}
        onOpenChange={(o) => !o && setDrawerId(null)}
        onEdit={(g) => {
          setDrawerId(null);
          setFormState({ kind: "edit", group: g });
        }}
        onDelete={(g) => {
          setDrawerId(null);
          setDeleteTarget({
            id: g.id,
            name: g.name,
            pilgrimCount: g.pilgrimCount,
          });
        }}
        onEditPilgrim={(p) => setPilgrimForm({ kind: "edit", pilgrim: p })}
        onDeletePilgrim={(p) =>
          setPilgrimDeleteTarget({ id: p.id, fullName: p.fullName })
        }
      />

      {formState.kind !== "closed" ? (
        <GroupFormDialog
          open
          mode={formState}
          onOpenChange={(o) => !o && setFormState({ kind: "closed" })}
        />
      ) : null}

      <DeleteGroupDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />

      {pilgrimForm.kind === "edit" ? (
        <PilgrimFormDialog
          open
          mode={{ kind: "edit", pilgrim: pilgrimForm.pilgrim }}
          onOpenChange={(o) => !o && setPilgrimForm({ kind: "closed" })}
        />
      ) : null}

      <DeletePilgrimDialog
        target={pilgrimDeleteTarget}
        onClose={() => setPilgrimDeleteTarget(null)}
      />
    </div>
  );
}
