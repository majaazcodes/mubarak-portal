"use client";

import { Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDownloadBulkBadges } from "@/lib/hooks/api/use-badges";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClear: () => void;
}

export function BulkActionsBar({ selectedIds, onClear }: BulkActionsBarProps) {
  const download = useDownloadBulkBadges();
  const count = selectedIds.length;
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="sticky top-0 z-20 -mx-6 flex items-center justify-between border-b bg-background/95 px-6 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <p className="text-sm font-medium">
        {count} {count === 1 ? "pilgrim" : "pilgrims"} selected
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => download.mutate(selectedIds)}
          disabled={download.isPending}
        >
          {download.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="mr-2 h-4 w-4" aria-hidden />
          )}
          Download Badges (ZIP)
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={download.isPending}
        >
          <X className="mr-2 h-4 w-4" aria-hidden /> Clear
        </Button>
      </div>
    </div>
  );
}
