import { Loader2 } from "lucide-react";

export default function Loading(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2
        className="h-6 w-6 animate-spin text-muted-foreground"
        aria-label="Loading"
      />
    </div>
  );
}
