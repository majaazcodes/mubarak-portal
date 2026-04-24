import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";

// One row as parsed from CSV/XLSX. Values are already normalised to strings
// (trimmed, upper-cased for passport). Validation errors are collected, not
// thrown — the caller reports them per-row in the phase-1 preview.
export class BulkImportRowDto {
  @IsString()
  @Length(1, 200)
  fullName!: string;

  @IsString()
  @Length(6, 20)
  @Matches(/^[A-Z][0-9]{7,8}$/, {
    message: "passportNo must be 1 letter + 7-8 digits",
  })
  passportNo!: string;

  @IsDateString({}, { message: "dob must be YYYY-MM-DD" })
  dob!: string;

  @IsIn(["male", "female"])
  gender!: "male" | "female";

  @IsOptional()
  @IsString()
  @Length(2, 2)
  nationality?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  nationalId?: string;
}

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
