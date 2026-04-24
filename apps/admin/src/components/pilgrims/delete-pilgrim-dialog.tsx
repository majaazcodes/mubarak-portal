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
import { useDeletePilgrim } from "@/lib/hooks/api/use-pilgrim-mutations";

interface DeletePilgrimDialogProps {
  target: { id: string; fullName: string } | null;
  onClose: () => void;
}

export function DeletePilgrimDialog({
  target,
  onClose,
}: DeletePilgrimDialogProps) {
  const del = useDeletePilgrim();
  const open = target !== null;

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
            Delete {target?.fullName ?? "pilgrim"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Their QR code will be revoked immediately and the record
            soft-deleted. Scans using the old code will fail. This can’t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={del.isPending}
            onClick={(e) => {
              // Prevent the default auto-close so we can close via onSuccess.
              e.preventDefault();
              if (!target) return;
              del.mutate(target, {
                onSuccess: () => onClose(),
              });
            }}
          >
            {del.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete pilgrim"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
