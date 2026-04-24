import { Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyGroupsProps {
  onCreate?: () => void;
}

export function EmptyGroups({ onCreate }: EmptyGroupsProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Layers className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <p className="text-lg font-semibold">No groups yet</p>
        <p className="text-sm text-muted-foreground">
          Travel groups organize pilgrims by departure batch.
        </p>
      </div>
      {onCreate ? (
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" aria-hidden /> Create your first group
        </Button>
      ) : null}
    </div>
  );
}
