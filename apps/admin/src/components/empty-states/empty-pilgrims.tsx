import { FileUp, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyPilgrimsProps {
  onAdd?: () => void;
  onImport?: () => void;
}

export function EmptyPilgrims({ onAdd, onImport }: EmptyPilgrimsProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Users className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <p className="text-lg font-semibold">No pilgrims yet</p>
        <p className="text-sm text-muted-foreground">
          Get started by importing from Excel or adding a pilgrim manually.
        </p>
      </div>
      <div className="flex gap-2">
        {onAdd ? (
          <Button onClick={onAdd}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden /> Add pilgrim
          </Button>
        ) : null}
        {onImport ? (
          <Button variant="outline" onClick={onImport}>
            <FileUp className="mr-2 h-4 w-4" aria-hidden /> Import from Excel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
