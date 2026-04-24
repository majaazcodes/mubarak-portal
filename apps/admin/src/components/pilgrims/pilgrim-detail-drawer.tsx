"use client";

import { useState } from "react";
import { differenceInYears, format, parseISO } from "date-fns";
import { Download, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/empty-states/error-state";
import { StatusBadge } from "./status-badge";
import { QrImage } from "./qr-image";
import { usePilgrim } from "@/lib/hooks/api/use-pilgrim";
import { useQrForPilgrim, useRegenerateQr } from "@/lib/hooks/api/use-qr";
import type { PilgrimDetail } from "@/lib/types/pilgrim";

interface PilgrimDetailDrawerProps {
  pilgrimId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (pilgrim: PilgrimDetail) => void;
  onDelete: (pilgrim: PilgrimDetail) => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatAge(dob: string | null): string {
  if (!dob) return "—";
  try {
    const years = differenceInYears(new Date(), parseISO(dob));
    return `${years} yr`;
  } catch {
    return "—";
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

export function PilgrimDetailDrawer({
  pilgrimId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: PilgrimDetailDrawerProps) {
  const q = usePilgrim(pilgrimId);
  const pilgrim = q.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-xl"
        srDescription="Pilgrim details including personal info, travel, QR code, and actions."
      >
        <SheetHeader className="border-b px-6 py-4 text-left">
          {q.isLoading || !pilgrim ? (
            <>
              <SheetTitle>
                <Skeleton className="h-5 w-48" />
              </SheetTitle>
              <SheetDescription>
                <Skeleton className="mt-1 h-4 w-24" />
              </SheetDescription>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{initials(pilgrim.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate">
                    {pilgrim.fullName}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    <span className="font-mono text-xs">
                      {pilgrim.passportNo}
                    </span>
                    <span>•</span>
                    <StatusBadge status={pilgrim.status} />
                  </SheetDescription>
                </div>
              </div>
            </>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {q.isError ? (
            <div className="p-6">
              <ErrorState
                title="Couldn’t load pilgrim"
                onRetry={() => void q.refetch()}
              />
            </div>
          ) : !pilgrim ? (
            <DetailSkeleton />
          ) : (
            <Tabs defaultValue="details" className="flex h-full flex-col">
              <div className="border-b px-6 pt-3">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="medical">Medical</TabsTrigger>
                  <TabsTrigger value="travel">Travel</TabsTrigger>
                  <TabsTrigger value="qr">QR</TabsTrigger>
                  <TabsTrigger value="audit">Audit</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="details" className="px-6 py-4">
                <DetailsTab pilgrim={pilgrim} />
              </TabsContent>
              <TabsContent value="medical" className="px-6 py-4">
                <PlaceholderCard message="Medical records coming in Phase 2." />
              </TabsContent>
              <TabsContent value="travel" className="px-6 py-4">
                <TravelTab pilgrim={pilgrim} />
              </TabsContent>
              <TabsContent value="qr" className="px-6 py-4">
                <QrTab pilgrimId={pilgrim.id} />
              </TabsContent>
              <TabsContent value="audit" className="px-6 py-4">
                <PlaceholderCard message="Audit trail coming soon." />
              </TabsContent>
            </Tabs>
          )}
        </div>

        {pilgrim ? (
          <div className="flex items-center justify-end gap-2 border-t bg-background px-6 py-3">
            <Button variant="outline" onClick={() => onDelete(pilgrim)}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Delete
            </Button>
            <Button onClick={() => onEdit(pilgrim)}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden /> Edit
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailsTab({ pilgrim }: { pilgrim: PilgrimDetail }) {
  return (
    <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">Passport</dt>
      <dd className="font-mono text-xs">{pilgrim.passportNo}</dd>

      <dt className="text-muted-foreground">National ID</dt>
      <dd>{pilgrim.nationalId ?? "—"}</dd>

      <dt className="text-muted-foreground">Date of birth</dt>
      <dd>
        {formatDate(pilgrim.dob)} ({formatAge(pilgrim.dob)})
      </dd>

      <dt className="text-muted-foreground">Gender</dt>
      <dd className="capitalize">{pilgrim.gender}</dd>

      <dt className="text-muted-foreground">Nationality</dt>
      <dd>{pilgrim.nationality ?? "—"}</dd>

      <dt className="text-muted-foreground">Groups</dt>
      <dd className="flex flex-wrap gap-1">
        {pilgrim.groups.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          pilgrim.groups.map((g) => (
            <Badge key={g.id} variant="secondary">
              {g.name}
            </Badge>
          ))
        )}
      </dd>

      <dt className="col-span-2 mt-2 text-sm font-semibold">
        Emergency contact
      </dt>

      {pilgrim.emergencyContact ? (
        <>
          <dt className="text-muted-foreground">Name</dt>
          <dd>{pilgrim.emergencyContact.name}</dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="font-mono">{pilgrim.emergencyContact.phone}</dd>
          <dt className="text-muted-foreground">Relation</dt>
          <dd className="capitalize">{pilgrim.emergencyContact.relation}</dd>
        </>
      ) : (
        <dd className="col-span-2 text-muted-foreground">
          No emergency contact on file.
        </dd>
      )}

      {pilgrim.notes ? (
        <>
          <Separator className="col-span-2 my-2" />
          <dt className="col-span-2 text-sm font-semibold">Notes</dt>
          <dd className="col-span-2 whitespace-pre-wrap text-sm">
            {pilgrim.notes}
          </dd>
        </>
      ) : null}
    </dl>
  );
}

function TravelTab({ pilgrim }: { pilgrim: PilgrimDetail }) {
  const travel = pilgrim.travel;
  if (!travel) {
    return (
      <PlaceholderCard message="No travel details yet. Use Edit to add them." />
    );
  }
  return (
    <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">Flight no.</dt>
      <dd className="font-mono">{travel.flightNo ?? "—"}</dd>
      <dt className="text-muted-foreground">Arrival</dt>
      <dd>{formatDate(travel.arrivalDate)}</dd>
      <dt className="text-muted-foreground">Hotel</dt>
      <dd>{travel.hotelName ?? "—"}</dd>
    </dl>
  );
}

function QrTab({ pilgrimId }: { pilgrimId: string }) {
  const q = useQrForPilgrim(pilgrimId);
  const regen = useRegenerateQr(pilgrimId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (q.isLoading) {
    return <Skeleton className="mx-auto h-48 w-48" />;
  }
  if (q.isError || !q.data) {
    return (
      <ErrorState
        title="Couldn’t load QR code"
        onRetry={() => void q.refetch()}
      />
    );
  }

  const qr = q.data;
  const isRevoked = Boolean(qr.revokedAt);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-lg border bg-white p-4">
        <QrImage token={qr.token} size={200} />
      </div>
      <div className="w-full space-y-1 text-center">
        <p className="break-all font-mono text-xs text-muted-foreground">
          {qr.token}
        </p>
        <p className="text-xs text-muted-foreground">
          Version {qr.version}
          {isRevoked ? " • revoked" : ""}
        </p>
      </div>
      <div className="flex w-full gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled
          title="Coming in Prompt #7"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden /> Download badge (PDF)
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setConfirmOpen(true)}
          disabled={regen.isPending}
        >
          {regen.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          )}
          Regenerate
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate QR code?</AlertDialogTitle>
            <AlertDialogDescription>
              The current code will be revoked immediately. Any printed badges
              using the old code will stop working. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                regen.mutate(undefined);
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PlaceholderCard({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3 px-6 py-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}
