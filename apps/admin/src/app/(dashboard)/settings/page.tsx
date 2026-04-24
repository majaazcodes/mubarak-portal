"use client";

import { useUser } from "@/lib/hooks/use-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage(): React.ReactElement {
  const { user, isLoading } = useUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Your profile and agency preferences.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>From your current session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isLoading && !user ? (
            <>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-32" />
            </>
          ) : user ? (
            <dl className="grid grid-cols-[8rem_1fr] gap-y-1">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{user.fullName}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{user.email}</dd>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="capitalize">{user.role.replace("_", " ")}</dd>
              <dt className="text-muted-foreground">Agency</dt>
              <dd>{user.agencyId ?? "—"}</dd>
            </dl>
          ) : (
            <p className="text-muted-foreground">No active session.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
