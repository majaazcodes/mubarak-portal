import { client } from "./client";

interface BadgeDownload {
  blob: Blob;
  filename: string;
}

export async function fetchPilgrimBadge(
  pilgrimId: string,
): Promise<BadgeDownload> {
  const res = await client.get<Blob>(`/badges/pilgrim/${pilgrimId}`, {
    responseType: "blob",
  });
  return {
    blob: res.data,
    filename: filenameFromContentDisposition(
      res.headers["content-disposition"],
      `badge-${pilgrimId}.pdf`,
    ),
  };
}

export async function fetchBulkBadges(
  pilgrimIds: string[],
): Promise<BadgeDownload> {
  const res = await client.post<Blob>(
    "/badges/bulk",
    { pilgrimIds },
    { responseType: "blob" },
  );
  return {
    blob: res.data,
    filename: filenameFromContentDisposition(
      res.headers["content-disposition"],
      `badges-${new Date().toISOString().slice(0, 10)}.zip`,
    ),
  };
}

// `attachment; filename="badge-A1234567.pdf"` → `badge-A1234567.pdf`
function filenameFromContentDisposition(
  header: unknown,
  fallback: string,
): string {
  if (typeof header !== "string") return fallback;
  const match = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return match?.[1] ?? fallback;
}
