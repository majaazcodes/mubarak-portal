"use client";

import { useEffect, useState } from "react";
import { FileUp, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { GroupWithPilgrimCount } from "@/lib/types/group";
import type { PilgrimStatus } from "@/lib/types/pilgrim";

// Sentinel for "any" in the shadcn Select, because Radix Select forbids the
// empty string as an item value (it treats "" as "clear the selection").
const ALL = "__all__";

interface PilgrimsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  groupId?: string;
  onGroupChange: (groupId: string | undefined) => void;
  status?: PilgrimStatus;
  onStatusChange: (status: PilgrimStatus | undefined) => void;
  groups: GroupWithPilgrimCount[];
  groupsLoading: boolean;
  onAdd: () => void;
  onImport: () => void;
}

const STATUS_OPTIONS: { value: PilgrimStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "issue", label: "Issue" },
];

export function PilgrimsToolbar({
  search,
  onSearchChange,
  groupId,
  onGroupChange,
  status,
  onStatusChange,
  groups,
  groupsLoading,
  onAdd,
  onImport,
}: PilgrimsToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounced = useDebounce(localSearch, 300);

  // Push debounced local changes up to the URL. Comparing to `search` avoids
  // an echo loop when the URL sync in the opposite direction fires.
  useEffect(() => {
    if (debounced !== search) onSearchChange(debounced);
  }, [debounced, search, onSearchChange]);

  // Sync the input if the URL changes externally (e.g. Clear filters button).
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
        <div className="relative md:max-w-sm">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search name or passport…"
            className="pl-8"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            aria-label="Search pilgrims"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={groupId ?? ALL}
            onValueChange={(v) => onGroupChange(v === ALL ? undefined : v)}
          >
            <SelectTrigger className="md:w-44" aria-label="Filter by group">
              <SelectValue placeholder="All groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All groups</SelectItem>
              {groupsLoading ? (
                <SelectItem value="__loading" disabled>
                  Loading…
                </SelectItem>
              ) : (
                groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Select
            value={status ?? ALL}
            onValueChange={(v) =>
              onStatusChange(v === ALL ? undefined : (v as PilgrimStatus))
            }
          >
            <SelectTrigger className="md:w-36" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onImport}>
          <FileUp className="mr-2 h-4 w-4" aria-hidden /> Import
        </Button>
        <Button onClick={onAdd}>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden /> Add pilgrim
        </Button>
      </div>
    </div>
  );
}
