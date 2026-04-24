"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGroups } from "@/lib/hooks/api/use-groups";
import {
  useCreatePilgrim,
  useUpdatePilgrim,
} from "@/lib/hooks/api/use-pilgrim-mutations";
import type { PilgrimDetail } from "@/lib/types/pilgrim";

// Backend validators this mirrors:
//   passportNo:  /^[A-Z][0-9]{7,8}$/i                  (create-pilgrim.dto.ts)
//   phone:       /^\+?[0-9]{7,15}$/                   (emergency-contact.dto.ts)
//   nationality: 2 chars                               (create-pilgrim.dto.ts)
//   notes:       max 1000                              (create-pilgrim.dto.ts)
const passportRe = /^[A-Z][0-9]{7,8}$/i;
const phoneRe = /^\+?[0-9]{7,15}$/;
const today = new Date().toISOString().slice(0, 10);

const formSchema = z.object({
  fullName: z.string().min(2, "Required").max(200),
  passportNo: z
    .string()
    .regex(
      passportRe,
      "Format: a letter followed by 7–8 digits (e.g. A1234567)",
    ),
  nationalId: z.string().max(20).optional(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .refine((v) => v <= today, { message: "DOB cannot be in the future" }),
  gender: z.enum(["male", "female"]),
  nationality: z
    .string()
    .length(2, "2-letter country code")
    .transform((v) => v.toUpperCase())
    .optional()
    .or(z.literal("")),
  status: z.enum(["pending", "active", "completed", "issue"]),
  emergencyName: z.string().max(100).optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().max(50).optional(),
  flightNo: z.string().max(20).optional(),
  arrivalDate: z.string().optional(),
  hotelName: z.string().max(100).optional(),
  groupIds: z.array(z.string().uuid()).max(5),
  notes: z.string().max(1000).optional(),
});

// Emergency-contact trio: all-or-nothing. Either leave blank, or fill all three.
const emergencyRefine = <T extends z.input<typeof formSchema>>(values: T) => {
  const { emergencyName, emergencyPhone, emergencyRelation } = values;
  const anyFilled = Boolean(
    emergencyName || emergencyPhone || emergencyRelation,
  );
  const allFilled = Boolean(
    emergencyName && emergencyPhone && emergencyRelation,
  );
  return !anyFilled || allFilled;
};

const refinedSchema = formSchema
  .refine(emergencyRefine, {
    message: "Fill all emergency contact fields or leave them all blank",
    path: ["emergencyName"],
  })
  .refine((v) => !v.emergencyPhone || phoneRe.test(v.emergencyPhone), {
    message: "Phone must be 7–15 digits, optional leading +",
    path: ["emergencyPhone"],
  });

type FormInput = z.input<typeof refinedSchema>;
type FormOutput = z.output<typeof refinedSchema>;

type Mode = { kind: "create" } | { kind: "edit"; pilgrim: PilgrimDetail };

interface PilgrimFormDialogProps {
  open: boolean;
  mode: Mode;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTS = ["pending", "active", "completed", "issue"] as const;
const GENDER_OPTS: { value: "male" | "female"; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];
const RELATION_OPTS = [
  "son",
  "daughter",
  "spouse",
  "brother",
  "sister",
  "parent",
  "other",
] as const;

export function PilgrimFormDialog({
  open,
  mode,
  onOpenChange,
}: PilgrimFormDialogProps) {
  const groupsQ = useGroups();
  const createM = useCreatePilgrim();
  const updateM = useUpdatePilgrim(mode.kind === "edit" ? mode.pilgrim.id : "");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);

  const defaults: FormInput = deriveDefaults(mode);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(refinedSchema),
    defaultValues: defaults,
  });

  // Reset when the dialog opens for a new pilgrim. We key the effect off a
  // stable tuple (open + mode identity) so we don't loop on every render
  // just because `defaults` is a fresh object.
  const editId = mode.kind === "edit" ? mode.pilgrim.id : "";
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;
  useEffect(() => {
    if (open) form.reset(defaultsRef.current);
  }, [open, mode.kind, editId, form]);

  const isSubmitting = createM.isPending || updateM.isPending;

  const requestClose = () => {
    if (form.formState.isDirty && !isSubmitting) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const submit = form.handleSubmit(async (values) => {
    const payload = buildPayload(values);
    try {
      if (mode.kind === "create") {
        await createM.mutateAsync(payload);
      } else {
        await updateM.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      // The mutation's onError has already toasted — we still need to surface
      // a 409 PASSPORT_DUPLICATE inline on the field.
      const message = err instanceof Error ? err.message : "";
      if (
        /already exists/i.test(message) ||
        /PASSPORT_DUPLICATE/.test(message)
      ) {
        form.setError("passportNo", {
          message: "This passport is already registered in your agency.",
        });
      }
    }
  });

  const groups = groupsQ.data?.items ?? [];

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
          else onOpenChange(true);
        }}
      >
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>
              {mode.kind === "create" ? "Add pilgrim" : "Edit pilgrim"}
            </DialogTitle>
            <DialogDescription>
              {mode.kind === "create"
                ? "Enter passport + personal details. A QR code is issued on save."
                : "Update any field below. Changes are audited."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={submit} className="flex max-h-[70vh] flex-col">
              <ScrollArea className="flex-1">
                <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="passportNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passport no.</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="A1234567"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>National ID (optional)</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of birth</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            max={today}
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GENDER_OPTS.map((g) => (
                              <SelectItem key={g.value} value={g.value}>
                                {g.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nationality</FormLabel>
                        <FormControl>
                          <Input
                            maxLength={2}
                            placeholder="IN"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUS_OPTS.map((s) => (
                              <SelectItem
                                key={s}
                                value={s}
                                className="capitalize"
                              >
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 border-t px-6 py-4">
                  <h3 className="text-sm font-semibold">
                    Emergency contact (optional)
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="emergencyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input disabled={isSubmitting} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+919876543210"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyRelation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relation</FormLabel>
                          <Select
                            value={field.value ?? ""}
                            onValueChange={field.onChange}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select relation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RELATION_OPTS.map((r) => (
                                <SelectItem
                                  key={r}
                                  value={r}
                                  className="capitalize"
                                >
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-t px-6 py-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-sm font-semibold"
                    onClick={() => setTravelOpen((o) => !o)}
                    aria-expanded={travelOpen}
                  >
                    <span>Travel details (optional)</span>
                    {travelOpen ? (
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    ) : (
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                  {travelOpen ? (
                    <div className="mt-3 grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="flightNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flight no.</FormLabel>
                            <FormControl>
                              <Input disabled={isSubmitting} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="arrivalDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Arrival date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                disabled={isSubmitting}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hotelName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hotel</FormLabel>
                            <FormControl>
                              <Input disabled={isSubmitting} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 border-t px-6 py-4">
                  <FormField
                    control={form.control}
                    name="groupIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Groups (max 5)</FormLabel>
                        <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                          {groupsQ.isLoading ? (
                            <p className="text-sm text-muted-foreground">
                              Loading groups…
                            </p>
                          ) : groups.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No groups yet.
                            </p>
                          ) : (
                            groups.map((g) => {
                              const checked = field.value.includes(g.id);
                              return (
                                <label
                                  key={g.id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <Checkbox
                                    checked={checked}
                                    disabled={
                                      isSubmitting ||
                                      (!checked && field.value.length >= 5)
                                    }
                                    onCheckedChange={(v) => {
                                      const next =
                                        v === true
                                          ? [...field.value, g.id]
                                          : field.value.filter(
                                              (id) => id !== g.id,
                                            );
                                      field.onChange(next);
                                    }}
                                  />
                                  {g.name}
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {g.pilgrimCount}/{g.maxSize}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            maxLength={1000}
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>

              <DialogFooter className="border-t px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : mode.kind === "create" ? (
                    "Create pilgrim"
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved edits will be lost. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardOpen(false);
                onOpenChange(false);
                if (mode.kind === "create") {
                  toast.info("Draft discarded.");
                }
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function deriveDefaults(mode: Mode): FormInput {
  if (mode.kind === "create") {
    return {
      fullName: "",
      passportNo: "",
      nationalId: undefined,
      dob: "",
      gender: "male",
      nationality: "IN",
      status: "pending",
      emergencyName: "",
      emergencyPhone: "",
      emergencyRelation: "",
      flightNo: "",
      arrivalDate: "",
      hotelName: "",
      groupIds: [],
      notes: "",
    };
  }
  const p = mode.pilgrim;
  return {
    fullName: p.fullName,
    passportNo: p.passportNo,
    nationalId: p.nationalId ?? undefined,
    dob: p.dob ?? "",
    gender: p.gender,
    nationality: p.nationality ?? "IN",
    status: p.status,
    emergencyName: p.emergencyContact?.name ?? "",
    emergencyPhone: p.emergencyContact?.phone ?? "",
    emergencyRelation: p.emergencyContact?.relation ?? "",
    flightNo: p.travel?.flightNo ?? "",
    arrivalDate: p.travel?.arrivalDate ?? "",
    hotelName: p.travel?.hotelName ?? "",
    groupIds: p.groups.map((g) => g.id),
    notes: p.notes ?? "",
  };
}

function emptyToUndef(v: string | undefined): string | undefined {
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

function buildPayload(v: FormOutput) {
  const payload = {
    fullName: v.fullName,
    passportNo: v.passportNo.toUpperCase(),
    dob: v.dob,
    gender: v.gender,
    status: v.status,
    nationality: emptyToUndef(v.nationality || undefined) ?? "IN",
    nationalId: emptyToUndef(v.nationalId),
    emergencyContact:
      v.emergencyName && v.emergencyPhone && v.emergencyRelation
        ? {
            name: v.emergencyName,
            phone: v.emergencyPhone,
            relation: v.emergencyRelation,
          }
        : undefined,
    travel:
      v.flightNo || v.arrivalDate || v.hotelName
        ? {
            flightNo: emptyToUndef(v.flightNo),
            arrivalDate: emptyToUndef(v.arrivalDate),
            hotelName: emptyToUndef(v.hotelName),
          }
        : undefined,
    groupIds: v.groupIds,
    notes: emptyToUndef(v.notes),
  };
  return payload;
}
