"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateGroup,
  useUpdateGroup,
} from "@/lib/hooks/api/use-group-mutations";
import type { GroupWithPilgrimCount } from "@/lib/types/group";

const formSchema = z
  .object({
    name: z.string().min(2, "Required").max(100),
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
    returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
    // Zod v4 replaced `invalid_type_error` with the `error` option; we rely
    // on the default "Expected number, received NaN" when the input is blank.
    maxSize: z.number().int().min(1, "Min 1").max(500, "Max 500"),
    notes: z.string().max(1000).optional(),
  })
  .refine((v) => v.returnDate > v.departureDate, {
    message: "Return must be after departure",
    path: ["returnDate"],
  });

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

type Mode = { kind: "create" } | { kind: "edit"; group: GroupWithPilgrimCount };

interface GroupFormDialogProps {
  open: boolean;
  mode: Mode;
  onOpenChange: (open: boolean) => void;
}

export function GroupFormDialog({
  open,
  mode,
  onOpenChange,
}: GroupFormDialogProps) {
  const createM = useCreateGroup();
  const updateM = useUpdateGroup(mode.kind === "edit" ? mode.group.id : "");
  const [discardOpen, setDiscardOpen] = useState(false);

  const defaults = deriveDefaults(mode);
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });

  // Stable ref for defaults so the effect doesn't loop on every render.
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;
  const editId = mode.kind === "edit" ? mode.group.id : "";
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
    const payload = {
      name: values.name,
      departureDate: values.departureDate,
      returnDate: values.returnDate,
      maxSize: values.maxSize,
      notes: values.notes && values.notes.length > 0 ? values.notes : undefined,
    };
    try {
      if (mode.kind === "create") {
        await createM.mutateAsync(payload);
      } else {
        await updateM.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // Mutation hook already toasted; nothing else to do here.
    }
  });

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
          else onOpenChange(true);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode.kind === "create" ? "Create group" : "Edit group"}
            </DialogTitle>
            <DialogDescription>
              {mode.kind === "create"
                ? "Define a travel group — pilgrims can be assigned later."
                : "Update the group details. Pilgrim assignments are managed separately."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={submit} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Group A - Delhi"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="departureDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="returnDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="maxSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max size</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        disabled={isSubmitting}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
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

              <DialogFooter>
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
                    "Create group"
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
      name: "",
      departureDate: "",
      returnDate: "",
      maxSize: 50,
      notes: "",
    };
  }
  const g = mode.group;
  return {
    name: g.name,
    departureDate: g.departureDate ?? "",
    returnDate: g.returnDate ?? "",
    maxSize: g.maxSize,
    notes: g.notes ?? "",
  };
}
