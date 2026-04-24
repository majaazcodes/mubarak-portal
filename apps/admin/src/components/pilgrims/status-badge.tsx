import { Badge } from "@/components/ui/badge";
import type { PilgrimStatus } from "@/lib/types/pilgrim";

const LABELS: Record<PilgrimStatus, string> = {
  pending: "Pending",
  active: "Active",
  completed: "Completed",
  issue: "Issue",
};

const VARIANTS: Record<
  PilgrimStatus,
  "default" | "secondary" | "success" | "destructive" | "warning" | "outline"
> = {
  pending: "secondary",
  active: "success",
  completed: "default",
  issue: "destructive",
};

export function StatusBadge({ status }: { status: PilgrimStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
