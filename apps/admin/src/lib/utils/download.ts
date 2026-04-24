// Trigger a browser download for an in-memory blob. Uses the native anchor +
// URL.createObjectURL pattern (same approach as bulk-import-dialog's template
// download) so we don't need file-saver as a dependency.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
