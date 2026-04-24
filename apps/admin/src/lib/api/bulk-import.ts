import type { BulkImportResponse } from "@/lib/types/bulk-import";
import { PILGRIMS } from "./endpoints";

// fetch's Request API has no upload progress event, so we drop to XHR when
// the caller wants a progress indicator. Goes through the Next.js proxy
// (/api/backend/...) so the httpOnly cookie is attached server-side, same as
// axios-based calls.
export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

interface BulkImportOptions {
  file: File;
  confirm: boolean;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}

export function bulkImportPilgrims(
  opts: BulkImportOptions,
): Promise<BulkImportResponse> {
  const { file, confirm, onProgress, signal } = opts;

  return new Promise<BulkImportResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url =
      "/api/backend" + PILGRIMS.bulkImport + (confirm ? "?confirm=true" : "");

    xhr.open("POST", url, true);
    xhr.responseType = "json";
    xhr.withCredentials = true;

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as BulkImportResponse);
      } else {
        const body = xhr.response as { message?: string; error?: string };
        reject(
          new Error(
            body?.message ??
              body?.error ??
              `Bulk import failed (HTTP ${xhr.status})`,
          ),
        );
      }
    };
    xhr.onerror = () => reject(new Error("Network error during bulk import"));
    xhr.ontimeout = () => reject(new Error("Bulk import timed out"));

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}
