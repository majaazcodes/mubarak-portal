"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/empty-states/error-state";
import { PilgrimDetailDrawer } from "@/components/pilgrims/pilgrim-detail-drawer";
import { useGroup } from "@/lib/hooks/api/use-group";
import type { GroupWithPilgrimCount } from "@/lib/types/group";
import type { PilgrimDetail } from "@/lib/types/pilgrim";
import { GroupPilgrimsList } from "./group-pilgrims-list";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

interface GroupDetailDrawerProps {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (group: GroupWithPilgrimCount) => void;
  onDelete: (group: GroupWithPilgrimCount) => void;
  onEditPilgrim: (pilgrim: PilgrimDetail) => void;
  onDeletePilgrim: (pilgrim: PilgrimDetail) => void;
}

export function GroupDetailDrawer({
  groupId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onEditPilgrim,
  onDeletePilgrim,
}: GroupDetailDrawerProps) {
  const q = useGroup(groupId);
  const group = q.data;
  const [selectedPilgrimId, setSelectedPilgrimId] = useState<string | null>(
    null,
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col p-0 sm:max-w-xl"
          srDescription="Group details and assigned pilgrims."
        >
          <SheetHeader className="border-b px-6 py-4 text-left">
            {q.isLoading || !group ? (
              <>
                <SheetTitle>
                  <Skeleton className="h-5 w-48" />
                </SheetTitle>
                <SheetDescription>
                  <Skeleton className="mt-1 h-4 w-24" />
                </SheetDescription>
              </>
            ) : (
              <>
                <SheetTitle>{group.name}</SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Users className="h-3 w-3" aria-hidden />
                    {group.pilgrimCount}/{group.maxSize} pilgrims
                  </Badge>
                </SheetDescription>
              </>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {q.isError ? (
              <div className="p-6">
                <ErrorState
                  title="Couldn’t load group"
                  onRetry={() => void q.refetch()}
                />
              </div>
            ) : !group ? (
              <div className="space-y-3 px-6 py-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : (
              <Tabs defaultValue="details" className="flex h-full flex-col">
                <div className="border-b px-6 pt-3">
                  <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="pilgrims">
                      Pilgrims ({group.pilgrimCount})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="details" className="px-6 py-4">
                  <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Departure</dt>
                    <dd>{formatDate(group.departureDate)}</dd>
                    <dt className="text-muted-foreground">Return</dt>
                    <dd>{formatDate(group.returnDate)}</dd>
                    <dt className="text-muted-foreground">Max size</dt>
                    <dd>{group.maxSize}</dd>
                    <dt className="text-muted-foreground">Leader</dt>
                    <dd className="font-mono text-xs">
                      {group.leaderUserId ?? "—"}
                    </dd>
                    {group.notes ? (
                      <>
                        <dt className="col-span-2 mt-2 text-sm font-semibold">
                          Notes
                        </dt>
                        <dd className="col-span-2 whitespace-pre-wrap text-sm">
                          {group.notes}
                        </dd>
                      </>
                    ) : null}
                  </dl>
                </TabsContent>

                <TabsContent value="pilgrims" className="px-6 py-4">
                  <GroupPilgrimsList
                    groupId={group.id}
                    onSelect={setSelectedPilgrimId}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>

          {group ? (
            <div className="flex items-center justify-end gap-2 border-t bg-background px-6 py-3">
              <Button variant="outline" onClick={() => onDelete(group)}>
                <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Delete
              </Button>
              <Button onClick={() => onEdit(group)}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden /> Edit
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Nested drawer for viewing a pilgrim selected from the group's list. */}
      <PilgrimDetailDrawer
        pilgrimId={selectedPilgrimId}
        open={selectedPilgrimId !== null}
        onOpenChange={(o) => !o && setSelectedPilgrimId(null)}
        onEdit={(p) => {
          setSelectedPilgrimId(null);
          onEditPilgrim(p);
        }}
        onDelete={(p) => {
          setSelectedPilgrimId(null);
          onDeletePilgrim(p);
        }}
      />
    </>
  );
}
