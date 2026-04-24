"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Layers, QrCode, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkImportDialog } from "@/components/pilgrims/bulk-import-dialog";
import { PilgrimFormDialog } from "@/components/pilgrims/pilgrim-form-dialog";
import { useGroups } from "@/lib/hooks/api/use-groups";
import { usePilgrimsTotal } from "@/lib/hooks/api/use-pilgrims-total";
import { useUser } from "@/lib/hooks/use-user";

interface StatCard {
  label: string;
  icon: typeof Users;
  render: () => React.ReactNode;
  hint?: string;
}

export default function DashboardPage(): React.ReactElement {
  const router = useRouter();
  const { user } = useUser();
  const pilgrimsTotal = usePilgrimsTotal();
  const groups = useGroups();

  const [createPilgrimOpen, setCreatePilgrimOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const stats: StatCard[] = [
    {
      label: "Total Pilgrims",
      icon: Users,
      render: () =>
        pilgrimsTotal.isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : pilgrimsTotal.isError ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="text-3xl font-semibold">
            {(pilgrimsTotal.data ?? 0).toLocaleString()}
          </span>
        ),
    },
    {
      label: "Active Groups",
      icon: Layers,
      render: () =>
        groups.isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : groups.isError ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="text-3xl font-semibold">
            {groups.data?.items.length ?? 0}
          </span>
        ),
    },
    {
      label: "Pending Visas",
      icon: FileUp,
      render: () => <span className="text-3xl font-semibold">—</span>,
      hint: "Coming in Phase 2",
    },
    {
      label: "Scans Today",
      icon: QrCode,
      render: () => <span className="text-3xl font-semibold">—</span>,
      hint: "Coming in Phase 2",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back{user ? `, ${user.fullName}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s a quick snapshot of your agency.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                {s.render()}
                {s.hint ? (
                  <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Your recent actions will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No activity yet — start by importing pilgrims or creating a group.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              variant="secondary"
              className="justify-start"
              onClick={() => setCreatePilgrimOpen(true)}
            >
              <Users className="mr-2 h-4 w-4" aria-hidden /> Add pilgrim
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              onClick={() => setImportOpen(true)}
            >
              <FileUp className="mr-2 h-4 w-4" aria-hidden /> Import from Excel
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              onClick={() => router.push("/groups")}
            >
              <Layers className="mr-2 h-4 w-4" aria-hidden /> View groups
            </Button>
          </CardContent>
        </Card>
      </div>

      {createPilgrimOpen ? (
        <PilgrimFormDialog
          open
          mode={{ kind: "create" }}
          onOpenChange={(o) => !o && setCreatePilgrimOpen(false)}
        />
      ) : null}
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
