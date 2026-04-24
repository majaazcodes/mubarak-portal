import type { QrCode } from "@/lib/types/qr";
import { apiGet, apiPost } from "./client";
import { QR } from "./endpoints";

export async function fetchQr(pilgrimId: string): Promise<QrCode> {
  return apiGet<QrCode>(QR.byPilgrim(pilgrimId));
}

export async function regenerateQr(pilgrimId: string): Promise<QrCode> {
  return apiPost<QrCode>(QR.regenerate(pilgrimId));
}
