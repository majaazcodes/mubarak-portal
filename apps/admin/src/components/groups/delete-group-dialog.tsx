"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteGroup } from "@/lib/hooks/api/use-group-mutations";

interface DeleteTarget {
  id: string;
  name: string;
  pilgrimCount: number;
}

interface DeleteGroupDialogProps {
  target: DeleteTarget | null;
  onClose: () => void;
}

export function DeleteGroupDialog({ target, onClose }: DeleteGroupDialogProps) {
  const del = useDeleteGroup();
  const open = target !== null;
  const hasPilgrims = (target?.pilgrimCount ?? 0) > 0;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !del.isPending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {hasPilgrims
              ? `Can’t delete ${target?.name}`
              : `Delete ${target?.name ?? "group"}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasPilgrims
              ? `This group has ${target?.pilgrimCount} pilgrim${target?.pilgrimCount === 1 ? "" : "s"} assigned. Reassign them to another group first.`
              : "This group is empty and will be removed permanently."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {hasPilgrims ? (
            <AlertDialogAction onClick={onClose}>OK</AlertDialogAction>
          ) : (
            <>
              <AlertDialogCancel disabled={del.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={del.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  if (!target) return;
                  del.mutate(
                    { id: target.id, name: target.name },
                    { onSuccess: () => onClose() },
                  );
                }}
              >
                {del.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete group"
                )}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
