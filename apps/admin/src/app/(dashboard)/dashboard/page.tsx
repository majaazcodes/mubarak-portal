"use client";

import { FileUp, Layers, QrCode, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/lib/hooks/use-user";

interface StatCard {
  label: string;
  value: string;
  icon: typeof Users;
  hint?: string;
}

const STATS: StatCard[] = [
  { label: "Total Pilgrims", value: "1,000", icon: Users, hint: "seeded" },
  { label: "Active Groups", value: "5", icon: Layers },
  { label: "Pending Visas", value: "12", icon: FileUp, hint: "placeholder" },
  { label: "Scans Today", value: "0", icon: QrCode },
];

export default function DashboardPage(): React.ReactElement {
  const { user } = useUser();

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => {
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
                <div className="text-3xl font-semibold">{s.value}</div>
                {s.hint ? (
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
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
            <Button variant="secondary" className="justify-start">
              <Users className="mr-2 h-4 w-4" aria-hidden /> Add pilgrim
            </Button>
            <Button variant="secondary" className="justify-start">
              <FileUp className="mr-2 h-4 w-4" aria-hidden /> Import from Excel
            </Button>
            <Button variant="secondary" className="justify-start">
              <Layers className="mr-2 h-4 w-4" aria-hidden /> View groups
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
