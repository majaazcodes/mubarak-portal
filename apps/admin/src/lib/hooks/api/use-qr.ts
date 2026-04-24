"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchQr, regenerateQr } from "@/lib/api/qr";
import type { QrCode } from "@/lib/types/qr";

export function useQrForPilgrim(pilgrimId: string | null | undefined) {
  return useQuery<QrCode>({
    queryKey: ["qr", pilgrimId],
    queryFn: () => {
      if (!pilgrimId)
        throw new Error("useQrForPilgrim called without pilgrimId");
      return fetchQr(pilgrimId);
    },
    enabled: Boolean(pilgrimId),
    staleTime: 60_000,
  });
}

export function useRegenerateQr(pilgrimId: string) {
  const qc = useQueryClient();
  return useMutation<QrCode, Error, undefined>({
    mutationFn: () => regenerateQr(pilgrimId),
    onSuccess: (qr) => {
      qc.setQueryData(["qr", pilgrimId], qr);
      toast.success("QR code regenerated — old token revoked.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to regenerate QR code.");
    },
  });
}
