"use client";

import { format, parseISO } from "date-fns";
import { CalendarRange, MoreHorizontal, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GroupWithPilgrimCount } from "@/lib/types/group";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

interface GroupCardProps {
  group: GroupWithPilgrimCount;
  onView: (group: GroupWithPilgrimCount) => void;
  onEdit: (group: GroupWithPilgrimCount) => void;
  onDelete: (group: GroupWithPilgrimCount) => void;
}

export function GroupCard({ group, onView, onEdit, onDelete }: GroupCardProps) {
  return (
    <Card className="group cursor-pointer transition-colors hover:border-foreground/20">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <button
          type="button"
          onClick={() => onView(group)}
          className="min-w-0 flex-1 text-left"
        >
          <CardTitle className="text-lg">{group.name}</CardTitle>
        </button>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-2 -mt-1 h-8 w-8"
                aria-label={`Actions for ${group.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onView(group)}>
                View
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(group)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onDelete(group)}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent
        className="space-y-2 text-sm"
        role="button"
        tabIndex={0}
        onClick={() => onView(group)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onView(group);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden />
            {group.pilgrimCount}/{group.maxSize} pilgrims
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarRange className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">
            {formatDate(group.departureDate)} → {formatDate(group.returnDate)}
          </span>
        </div>
        {group.leaderUserId ? (
          <p className="truncate text-xs text-muted-foreground">
            Leader: <span className="font-mono">{group.leaderUserId}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No leader assigned
          </p>
        )}
        {group.notes ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {group.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
