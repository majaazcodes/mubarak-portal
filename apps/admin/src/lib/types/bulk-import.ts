// Mirrors apps/api/src/modules/pilgrims/dto/bulk-import.dto.ts
export interface BulkImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface BulkImportValidRow {
  row: number;
  fullName: string;
  passportNo: string;
  dob: string;
  gender: "male" | "female";
  nationality: string | null;
  nationalId: string | null;
}

export interface BulkImportPreview {
  mode: "validate";
  valid: number;
  invalid: number;
  rows: BulkImportValidRow[];
  errors: BulkImportRowError[];
}

export interface BulkImportResult {
  mode: "commit";
  inserted: number;
  skipped: number;
  errors: BulkImportRowError[];
}

export type BulkImportResponse = BulkImportPreview | BulkImportResult;
