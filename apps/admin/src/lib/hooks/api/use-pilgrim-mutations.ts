"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createPilgrim,
  deletePilgrim,
  updatePilgrim,
} from "@/lib/api/pilgrims";
import type {
  CreatePilgrimInput,
  CreatePilgrimResponse,
  PilgrimDetail,
  UpdatePilgrimInput,
} from "@/lib/types/pilgrim";

export function useCreatePilgrim() {
  const qc = useQueryClient();
  return useMutation<CreatePilgrimResponse, Error, CreatePilgrimInput>({
    mutationFn: createPilgrim,
    onSuccess: async ({ pilgrim }) => {
      toast.success(`Pilgrim ${pilgrim.fullName} created. QR code issued.`);
      await qc.invalidateQueries({ queryKey: ["pilgrims"] });
    },
    // Surface + toast errors with stable backend codes.
    onError: (err) => {
      toast.error(err.message || "Failed to create pilgrim.");
    },
  });
}

export function useUpdatePilgrim(id: string) {
  const qc = useQueryClient();
  return useMutation<
    PilgrimDetail,
    Error,
    UpdatePilgrimInput,
    { previous?: PilgrimDetail }
  >({
    mutationFn: (input) => updatePilgrim(id, input),
    // Optimistic update on the detail cache so the drawer updates instantly.
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["pilgrim", id] });
      const previous = qc.getQueryData<PilgrimDetail>(["pilgrim", id]);
      if (previous) {
        qc.setQueryData<PilgrimDetail>(["pilgrim", id], {
          ...previous,
          ...input,
          // shallow-merge ok for the fields a form can edit.
        } as PilgrimDetail);
      }
      return { previous };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(["pilgrim", id], ctx.previous);
      toast.error(err.message || "Failed to update pilgrim.");
    },
    onSuccess: async (updated) => {
      toast.success("Updated successfully");
      qc.setQueryData(["pilgrim", id], updated);
      await qc.invalidateQueries({ queryKey: ["pilgrims"] });
    },
  });
}

export function useDeletePilgrim() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { id: string; fullName: string }>({
    mutationFn: ({ id }) => deletePilgrim(id),
    onSuccess: async (_ok, { fullName }) => {
      toast.success(`Deleted ${fullName}.`);
      await qc.invalidateQueries({ queryKey: ["pilgrims"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete pilgrim.");
    },
  });
}
