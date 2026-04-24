import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptySearchResultsProps {
  query?: string;
  onClear: () => void;
}

export function EmptySearchResults({
  query,
  onClear,
}: EmptySearchResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <SearchX className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <p className="text-lg font-semibold">
          {query
            ? `No results for "${query}"`
            : "No pilgrims match your filters"}
        </p>
        <p className="text-sm text-muted-foreground">
          Try a different search term or clear the filters.
        </p>
      </div>
      <Button variant="outline" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
