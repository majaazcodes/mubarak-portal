"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bulkImportPilgrims } from "@/lib/api/bulk-import";
import type {
  BulkImportPreview,
  BulkImportResult,
} from "@/lib/types/bulk-import";

// State machine for the bulk-import UI. Holds both phase outputs + upload
// progress in one place so the dialog doesn't have to juggle 5 useStates.
type Status = "idle" | "validating" | "previewing" | "committing" | "done";

interface BulkImportState {
  status: Status;
  // 0..100 during upload, null afterwards (backend then processes synchronously
  // and we switch the UI to indeterminate).
  uploadPercent: number | null;
  preview: BulkImportPreview | null;
  result: BulkImportResult | null;
  error: string | null;
}

export function useBulkImport() {
  const qc = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<BulkImportState>({
    status: "idle",
    uploadPercent: null,
    preview: null,
    result: null,
    error: null,
  });

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({
      status: "idle",
      uploadPercent: null,
      preview: null,
      result: null,
      error: null,
    });
  }, []);

  const validate = useCallback(async (file: File) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState((s) => ({
      ...s,
      status: "validating",
      uploadPercent: 0,
      error: null,
    }));
    try {
      const res = await bulkImportPilgrims({
        file,
        confirm: false,
        onProgress: (p) =>
          setState((s) => ({ ...s, uploadPercent: p.percent })),
        signal: ctrl.signal,
      });
      if (res.mode !== "validate") {
        throw new Error("Unexpected response mode from validation phase.");
      }
      setState((s) => ({
        ...s,
        status: "previewing",
        uploadPercent: null,
        preview: res,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Validation failed.";
      setState((s) => ({
        ...s,
        status: "idle",
        uploadPercent: null,
        error: message,
      }));
      toast.error(message);
    }
  }, []);

  const commit = useCallback(
    async (file: File) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setState((s) => ({
        ...s,
        status: "committing",
        uploadPercent: 0,
        error: null,
      }));
      try {
        const res = await bulkImportPilgrims({
          file,
          confirm: true,
          onProgress: (p) =>
            setState((s) => ({ ...s, uploadPercent: p.percent })),
          signal: ctrl.signal,
        });
        if (res.mode !== "commit") {
          throw new Error("Unexpected response mode from commit phase.");
        }
        setState((s) => ({
          ...s,
          status: "done",
          uploadPercent: null,
          result: res,
        }));
        await qc.invalidateQueries({ queryKey: ["pilgrims"] });
        toast.success(
          `Imported ${res.inserted} pilgrim${res.inserted === 1 ? "" : "s"}${
            res.skipped ? `, skipped ${res.skipped}` : ""
          }.`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Import failed.";
        setState((s) => ({
          ...s,
          status: "previewing",
          uploadPercent: null,
          error: message,
        }));
        toast.error(message);
      }
    },
    [qc],
  );

  const backToIdle = useCallback(() => {
    setState((s) => ({
      ...s,
      status: "idle",
      uploadPercent: null,
      preview: null,
      error: null,
    }));
  }, []);

  return {
    ...state,
    validate,
    commit,
    reset,
    backToIdle,
  };
}
