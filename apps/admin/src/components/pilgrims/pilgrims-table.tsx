"use client";

import { useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { differenceInYears, parseISO } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import type { PilgrimListItem } from "@/lib/types/pilgrim";
import { StatusBadge } from "./status-badge";

const ROW_HEIGHT = 56;
const VISIBLE_HEIGHT = 560; // 10 rows; overflow scrolls

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function ageFromDob(dob: string | null): string {
  if (!dob) return "—";
  try {
    return String(differenceInYears(new Date(), parseISO(dob)));
  } catch {
    return "—";
  }
}

interface PilgrimsTableProps {
  rows: PilgrimListItem[];
  isLoading: boolean;
  isFetching: boolean;
  onRowClick?: (id: string) => void;
  onEdit?: (row: PilgrimListItem) => void;
  onDelete?: (row: PilgrimListItem) => void;
  // Controlled selection. If omitted, the table falls back to internal state.
  selection?: Record<string, boolean>;
  onSelectionChange?: (next: Record<string, boolean>) => void;
}

export function PilgrimsTable({
  rows,
  isLoading,
  isFetching,
  onRowClick,
  onEdit,
  onDelete,
  selection,
  onSelectionChange,
}: PilgrimsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalSelection, setInternalSelection] = useState<
    Record<string, boolean>
  >({});
  const selected = selection ?? internalSelection;
  const setSelected = (
    updater:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => {
    const next =
      typeof updater === "function"
        ? (
            updater as (
              prev: Record<string, boolean>,
            ) => Record<string, boolean>
          )(selected)
        : updater;
    if (onSelectionChange) onSelectionChange(next);
    else setInternalSelection(next);
  };

  const columns = useMemo<ColumnDef<PilgrimListItem>[]>(
    () => [
      {
        id: "select",
        header: () => {
          const all = rows.length > 0 && rows.every((r) => selected[r.id]);
          return (
            <Checkbox
              checked={all}
              onCheckedChange={(value) => {
                const next: Record<string, boolean> = { ...selected };
                for (const r of rows) next[r.id] = value === true;
                setSelected(next);
              }}
              aria-label="Select all"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={!!selected[row.original.id]}
            onCheckedChange={(value) =>
              setSelected((s) => ({ ...s, [row.original.id]: value === true }))
            }
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${row.original.fullName}`}
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: "fullName",
        accessorKey: "fullName",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {initials(row.original.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{row.original.fullName}</span>
          </div>
        ),
      },
      {
        accessorKey: "passportNo",
        header: "Passport",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: "gender",
        header: "Gender",
        cell: ({ getValue }) => (
          <span className="capitalize">{String(getValue())}</span>
        ),
        enableSorting: false,
      },
      {
        id: "age",
        accessorKey: "dob",
        header: "Age",
        cell: ({ row }) => ageFromDob(row.original.dob),
        sortingFn: (a, b) => {
          const da = a.original.dob ?? "";
          const db = b.original.dob ?? "";
          return da.localeCompare(db);
        },
      },
      {
        accessorKey: "nationality",
        header: "Nationality",
        cell: ({ getValue }) => String(getValue() ?? "—"),
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Actions for ${row.original.fullName}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => onRowClick?.(row.original.id)}
                >
                  View details
                </DropdownMenuItem>
                {onEdit ? (
                  <DropdownMenuItem onSelect={() => onEdit(row.original)}>
                    Edit
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                {onDelete ? (
                  <DropdownMenuItem
                    onSelect={() => onDelete(row.original)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        enableSorting: false,
        size: 48,
      },
    ],
    [rows, selected, onRowClick, onEdit, onDelete],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const sortedRows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalHeight - (virtualRows.at(-1)?.end ?? 0) : 0;

  if (isLoading && rows.length === 0) {
    return <SkeletonTable />;
  }

  return (
    <div
      ref={parentRef}
      className={cn(
        "relative overflow-auto rounded-lg border bg-background",
        isFetching && "opacity-70 transition-opacity",
      )}
      style={{ height: VISIBLE_HEIGHT }}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_hsl(var(--border))]">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => {
                const canSort = h.column.getCanSort();
                const sorted = h.column.getIsSorted();
                return (
                  <TableHead
                    key={h.id}
                    style={{ width: h.getSize() }}
                    className="h-11"
                  >
                    {canSort ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {sorted === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
                        )}
                      </Button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {paddingTop > 0 ? (
            <tr style={{ height: `${paddingTop}px` }} aria-hidden />
          ) : null}
          {virtualRows.map((vr) => {
            const row = sortedRows[vr.index];
            if (!row) return null;
            return (
              <TableRow
                key={row.id}
                data-index={vr.index}
                style={{ height: `${ROW_HEIGHT}px` }}
                className="cursor-pointer"
                onClick={() => onRowClick?.(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
          {paddingBottom > 0 ? (
            <tr style={{ height: `${paddingBottom}px` }} aria-hidden />
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-2 rounded-lg border bg-background p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-2"
          style={{ height: `${ROW_HEIGHT}px` }}
        >
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="ml-auto h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
