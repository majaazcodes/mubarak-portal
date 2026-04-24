"use client";

import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { fetchBulkBadges, fetchPilgrimBadge } from "@/lib/api/badges";
import { downloadBlob } from "@/lib/utils/download";

export function useDownloadPilgrimBadge() {
  return useMutation<{ blob: Blob; filename: string }, Error, string>({
    mutationFn: fetchPilgrimBadge,
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename);
      toast.success("Badge downloaded");
    },
    onError: async (err) => {
      toast.error(await friendlyBadgeError(err));
    },
  });
}

export function useDownloadBulkBadges() {
  return useMutation<
    { blob: Blob; filename: string; count: number },
    Error,
    string[]
  >({
    mutationFn: async (ids) => {
      const res = await fetchBulkBadges(ids);
      return { ...res, count: ids.length };
    },
    onSuccess: ({ blob, filename, count }) => {
      downloadBlob(blob, filename);
      toast.success(`${count} ${count === 1 ? "badge" : "badges"} downloaded`);
    },
    onError: async (err) => {
      toast.error(await friendlyBadgeError(err));
    },
  });
}

// Maps the backend's stable error codes to a user-facing message. Responses
// come back as a Blob (because we set responseType: "blob"), so we need to
// decode the JSON error body before we can read the `error` code.
async function friendlyBadgeError(err: unknown): Promise<string> {
  const code = await readErrorCode(err);
  switch (code) {
    case "PILGRIM_NOT_FOUND":
      return "Pilgrim not found or no access";
    case "QR_REVOKED":
      return "Regenerate the QR before printing the badge";
    case "QR_NOT_FOUND":
      return "This pilgrim has no QR code yet";
    case "BULK_LIMIT_EXCEEDED":
      return "Maximum 500 badges per download";
    default:
      return "Badge download failed. Try again.";
  }
}

async function readErrorCode(err: unknown): Promise<string | null> {
  if (!(err instanceof AxiosError) || !err.response) return null;
  const { data } = err.response;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text) as { error?: unknown };
      return typeof parsed.error === "string" ? parsed.error : null;
    } catch {
      return null;
    }
  }
  if (data && typeof data === "object" && "error" in data) {
    const v = (data as { error: unknown }).error;
    return typeof v === "string" ? v : null;
  }
  return null;
}
