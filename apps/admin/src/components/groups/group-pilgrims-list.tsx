"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/pilgrims/status-badge";
import { ErrorState } from "@/components/empty-states/error-state";
import { usePilgrims } from "@/lib/hooks/api/use-pilgrims";

const PAGE_SIZE = 20;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface GroupPilgrimsListProps {
  groupId: string;
  onSelect: (pilgrimId: string) => void;
}

export function GroupPilgrimsList({
  groupId,
  onSelect,
}: GroupPilgrimsListProps) {
  const [page, setPage] = useState(1);
  const q = usePilgrims({ groupId, page, limit: PAGE_SIZE });

  if (q.isError) {
    return (
      <ErrorState
        title="Couldn’t load pilgrims"
        onRetry={() => void q.refetch()}
      />
    );
  }

  if (q.isLoading && !q.data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-md p-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const items = q.data?.items ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = q.data?.totalPages ?? 1;

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        No pilgrims assigned to this group yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-md border">
        {items.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50 focus:bg-muted focus:outline-none"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {initials(p.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.fullName}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {p.passportNo}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total === 0
            ? "No pilgrims"
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            {page} / {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
