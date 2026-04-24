"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createGroup, deleteGroup, updateGroup } from "@/lib/api/groups";
import type {
  CreateGroupInput,
  GroupWithPilgrimCount,
  UpdateGroupInput,
} from "@/lib/types/group";

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation<GroupWithPilgrimCount, Error, CreateGroupInput>({
    mutationFn: createGroup,
    onSuccess: async (group) => {
      toast.success(`Group ${group.name} created.`);
      await qc.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create group.");
    },
  });
}

export function useUpdateGroup(id: string) {
  const qc = useQueryClient();
  return useMutation<
    GroupWithPilgrimCount,
    Error,
    UpdateGroupInput,
    { previous?: GroupWithPilgrimCount }
  >({
    mutationFn: (input) => updateGroup(id, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["group", id] });
      const previous = qc.getQueryData<GroupWithPilgrimCount>(["group", id]);
      if (previous) {
        qc.setQueryData<GroupWithPilgrimCount>(["group", id], {
          ...previous,
          ...input,
        });
      }
      return { previous };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(["group", id], ctx.previous);
      toast.error(err.message || "Failed to update group.");
    },
    onSuccess: async (updated) => {
      toast.success("Group updated.");
      qc.setQueryData(["group", id], updated);
      await qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { id: string; name: string }>({
    mutationFn: ({ id }) => deleteGroup(id),
    onSuccess: async (_ok, { name }) => {
      toast.success(`Group ${name} deleted.`);
      await qc.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (err) => {
      // Backend's GROUP_HAS_PILGRIMS error lands here if a pilgrim was
      // assigned between the dialog opening and the confirm click.
      toast.error(err.message || "Failed to delete group.");
    },
  });
}
