"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";
import { useBulkImport } from "@/lib/hooks/api/use-bulk-import";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = {
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
};

const TEMPLATE =
  "fullName,passportNo,dob,gender,nationality,nationalId\n" +
  "Ahmed Al-Rashid,A1234567,1980-05-12,male,IN,1234567890\n";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportDialog({
  open,
  onOpenChange,
}: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const imp = useBulkImport();

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      accept: ACCEPT,
      maxSize: MAX_BYTES,
      multiple: false,
      disabled: imp.status === "validating" || imp.status === "committing",
      onDropAccepted: (accepted) => {
        const next = accepted[0];
        if (next) setFile(next);
      },
    });

  const handleClose = (next: boolean) => {
    if (!next) {
      // Don't allow closing mid-commit.
      if (imp.status === "committing") return;
      setFile(null);
      imp.reset();
    }
    onOpenChange(next);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pilgrims-template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Bulk import pilgrims</DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file. We validate first; nothing is inserted
            until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          {(imp.status === "idle" || imp.status === "validating") && (
            <UploadStep
              file={file}
              onRemoveFile={() => setFile(null)}
              rootProps={getRootProps()}
              inputProps={getInputProps()}
              isDragActive={isDragActive}
              rejectionError={fileRejections[0]?.errors[0]?.message ?? null}
              onTemplate={downloadTemplate}
              status={imp.status}
              uploadPercent={imp.uploadPercent}
            />
          )}

          {imp.status === "previewing" && imp.preview && (
            <PreviewStep preview={imp.preview} />
          )}

          {imp.status === "committing" && (
            <CommittingStep uploadPercent={imp.uploadPercent} />
          )}

          {imp.status === "done" && imp.result && (
            <DoneStep
              inserted={imp.result.inserted}
              skipped={imp.result.skipped}
            />
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          {(imp.status === "idle" || imp.status === "validating") && (
            <>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={imp.status === "validating"}
              >
                Cancel
              </Button>
              <Button
                disabled={!file || imp.status === "validating"}
                onClick={() => file && imp.validate(file)}
              >
                {imp.status === "validating" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating…
                  </>
                ) : (
                  "Validate"
                )}
              </Button>
            </>
          )}

          {imp.status === "previewing" && imp.preview && (
            <>
              <Button variant="outline" onClick={imp.backToIdle}>
                Back
              </Button>
              <Button
                disabled={imp.preview.valid === 0 || !file}
                onClick={() => file && imp.commit(file)}
              >
                Import {imp.preview.valid} pilgrim
                {imp.preview.valid === 1 ? "" : "s"}
              </Button>
            </>
          )}

          {imp.status === "committing" && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing…
            </Button>
          )}

          {imp.status === "done" && (
            <Button onClick={() => handleClose(false)}>View pilgrims</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UploadStepProps {
  file: File | null;
  onRemoveFile: () => void;
  rootProps: React.HTMLAttributes<HTMLDivElement>;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  isDragActive: boolean;
  rejectionError: string | null;
  onTemplate: () => void;
  status: "idle" | "validating";
  uploadPercent: number | null;
}

function UploadStep(props: UploadStepProps) {
  return (
    <div className="space-y-4">
      <div
        {...props.rootProps}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center transition-colors",
          props.isDragActive && "border-primary bg-primary/5",
          props.status === "validating" && "cursor-not-allowed opacity-60",
        )}
      >
        <input {...props.inputProps} />
        <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm">
          {props.isDragActive
            ? "Drop the file here…"
            : "Drag a file here, or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">
          CSV or XLSX · up to 5 MB · max 1000 rows
        </p>
      </div>

      {props.rejectionError ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{props.rejectionError}</p>
        </div>
      ) : null}

      {props.file ? (
        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
          <FileSpreadsheet
            className="h-5 w-5 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{props.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(props.file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              props.onRemoveFile();
            }}
            disabled={props.status === "validating"}
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {props.status === "validating" && props.uploadPercent !== null ? (
        <Progress value={props.uploadPercent} aria-label="Upload progress" />
      ) : null}

      <button
        type="button"
        onClick={props.onTemplate}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        Not sure about the format? Download template
      </button>
    </div>
  );
}

function PreviewStep({
  preview,
}: {
  preview: NonNullable<ReturnType<typeof useBulkImport>["preview"]>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Valid" value={preview.valid} tone="success" />
        <SummaryCard
          label="Invalid"
          value={preview.invalid}
          tone="destructive"
        />
        <SummaryCard
          label="Total"
          value={preview.valid + preview.invalid}
          tone="neutral"
        />
      </div>

      <Tabs defaultValue="valid">
        <TabsList>
          <TabsTrigger value="valid">Valid ({preview.valid})</TabsTrigger>
          <TabsTrigger value="invalid">Invalid ({preview.invalid})</TabsTrigger>
        </TabsList>
        <TabsContent value="valid">
          <ScrollArea className="h-64 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Passport</TableHead>
                  <TableHead>DOB</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.slice(0, 20).map((r) => (
                  <TableRow key={r.row}>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.row}
                    </TableCell>
                    <TableCell>{r.fullName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.passportNo}
                    </TableCell>
                    <TableCell>{r.dob}</TableCell>
                  </TableRow>
                ))}
                {preview.rows.length > 20 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-xs text-muted-foreground"
                    >
                      + {preview.rows.length - 20} more
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="invalid">
          <ScrollArea className="h-64 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.errors.slice(0, 20).map((e, i) => (
                  <TableRow
                    key={`${e.row}-${e.field}-${i}`}
                    className="border-l-2 border-l-destructive/50"
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {e.row}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.field}
                    </TableCell>
                    <TableCell className="text-sm">{e.message}</TableCell>
                  </TableRow>
                ))}
                {preview.errors.length > 20 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-xs text-muted-foreground"
                    >
                      + {preview.errors.length - 20} more errors
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CommittingStep({ uploadPercent }: { uploadPercent: number | null }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Loader2
        className="h-8 w-8 animate-spin text-muted-foreground"
        aria-hidden
      />
      <p className="text-sm font-medium">Importing pilgrims…</p>
      <p className="text-xs text-muted-foreground">Don’t close this window.</p>
      <div className="w-full max-w-md">
        {uploadPercent !== null ? (
          <Progress value={uploadPercent} aria-label="Upload progress" />
        ) : (
          <Progress indeterminate aria-label="Processing" />
        )}
      </div>
    </div>
  );
}

function DoneStep({
  inserted,
  skipped,
}: {
  inserted: number;
  skipped: number;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-8 w-8" aria-hidden />
      </div>
      <div>
        <p className="text-lg font-semibold">Import complete</p>
        <p className="text-sm text-muted-foreground">
          Imported {inserted} pilgrim{inserted === 1 ? "" : "s"}
          {skipped > 0 ? `, skipped ${skipped}` : ""}.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "destructive" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-center",
        tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-900",
        tone === "destructive" &&
          "border-destructive/40 bg-destructive/5 text-destructive",
        tone === "neutral" && "bg-muted/40",
      )}
    >
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs uppercase tracking-wide">{label}</p>
    </div>
  );
}
