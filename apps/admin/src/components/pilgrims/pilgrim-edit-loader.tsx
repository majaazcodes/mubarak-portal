"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { usePilgrim } from "@/lib/hooks/api/use-pilgrim";
import { PilgrimFormDialog } from "./pilgrim-form-dialog";

interface PilgrimEditDialogLoaderProps {
  id: string;
  fallbackName: string;
  onClose: () => void;
}

/**
 * When "Edit" is triggered from a row action we only have the list data, but
 * the form needs the full PilgrimDetail (emergency contact, travel, groups,
 * notes). This wrapper shows a tiny spinner modal while fetching, then swaps
 * in the real PilgrimFormDialog.
 */
export function PilgrimEditDialogLoader({
  id,
  fallbackName,
  onClose,
}: PilgrimEditDialogLoaderProps) {
  const q = usePilgrim(id);

  useEffect(() => {
    if (q.isError) {
      toast.error("Couldn’t load pilgrim for editing.");
      onClose();
    }
  }, [q.isError, onClose]);

  if (q.data) {
    return (
      <PilgrimFormDialog
        open
        mode={{ kind: "edit", pilgrim: q.data }}
        onOpenChange={(o) => !o && onClose()}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xs">
        <VisuallyHidden>
          <DialogTitle>Loading pilgrim</DialogTitle>
          <DialogDescription>
            Fetching {fallbackName}&apos;s details.
          </DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2
            className="h-6 w-6 animate-spin text-muted-foreground"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">
            Loading {fallbackName}…
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
