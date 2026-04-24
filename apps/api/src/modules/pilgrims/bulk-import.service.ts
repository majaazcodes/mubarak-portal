import { Readable } from "node:stream";
import { Injectable, Logger } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { parse } from "@fast-csv/parse";
import ExcelJS from "exceljs";
import chunk from "lodash.chunk";
import { inArray, and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/client";
import { auditLogs, pilgrims } from "../../db/schema";
import type { NewPilgrim } from "../../db/types";
import { QrService } from "../qr/qr.service";
import { CacheService } from "../../common/services/cache.service";
import {
  type BulkImportPreview,
  type BulkImportResult,
  type BulkImportRowError,
  type BulkImportValidRow,
  BulkImportRowDto,
} from "./dto/bulk-import.dto";

const MAX_ROWS = 1000;
const INSERT_BATCH = 100;
const CSV_MIME = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
]);
const XLSX_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const REQUIRED_HEADERS = ["fullName", "passportNo", "dob", "gender"] as const;

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);

  constructor(
    private readonly qr: QrService,
    private readonly cache: CacheService,
  ) {}

  async validate(
    buffer: Buffer,
    mimetype: string,
    agencyId: string,
  ): Promise<BulkImportPreview> {
    const { valid, errors } = await this.parseAndValidate(
      buffer,
      mimetype,
      agencyId,
    );
    return {
      mode: "validate",
      valid: valid.length,
      invalid: errors.length,
      rows: valid,
      errors,
    };
  }

  async commit(
    buffer: Buffer,
    mimetype: string,
    agencyId: string,
    userId: string,
  ): Promise<BulkImportResult> {
    // Phase 2 re-validates the file — never trust a client telling us the file
    // hasn't changed since phase 1.
    const { valid, errors } = await this.parseAndValidate(
      buffer,
      mimetype,
      agencyId,
    );

    if (valid.length === 0) {
      return { mode: "commit", inserted: 0, skipped: errors.length, errors };
    }

    let inserted = 0;
    const runtimeErrors: BulkImportRowError[] = [];

    for (const batch of chunk(valid, INSERT_BATCH)) {
      const values: NewPilgrim[] = batch.map((r) => ({
        agencyId,
        fullName: r.fullName,
        passportNo: r.passportNo,
        dob: r.dob,
        gender: r.gender,
        nationality: r.nationality ?? "IN",
        nationalId: r.nationalId,
        status: "active",
      }));
      try {
        const rows = await db
          .insert(pilgrims)
          .values(values)
          .returning({ id: pilgrims.id });
        for (const row of rows) {
          await this.qr.createForPilgrim(row.id).catch((err: unknown) => {
            this.logger.warn(
              { err, pilgrimId: row.id },
              "QR create failed during bulk import",
            );
          });
        }
        inserted += rows.length;
      } catch (err) {
        this.logger.error({ err }, "bulk import batch failed");
        for (const r of batch) {
          runtimeErrors.push({
            row: r.row,
            field: "_insert",
            message:
              "Insert failed — likely duplicate passport or unique violation",
          });
        }
      }
    }

    await this.cache.invalidateAgencyLists(agencyId);
    await this.writeAudit(
      userId,
      agencyId,
      inserted,
      errors.length + runtimeErrors.length,
    );

    return {
      mode: "commit",
      inserted,
      skipped: errors.length + runtimeErrors.length,
      errors: [...errors, ...runtimeErrors],
    };
  }

  private async parseAndValidate(
    buffer: Buffer,
    mimetype: string,
    agencyId: string,
  ): Promise<{
    valid: BulkImportValidRow[];
    errors: BulkImportRowError[];
  }> {
    const rawRows = await this.parseByMime(buffer, mimetype);
    if (rawRows.length === 0) {
      return {
        valid: [],
        errors: [{ row: 0, field: "_file", message: "Empty file" }],
      };
    }
    if (rawRows.length > MAX_ROWS) {
      return {
        valid: [],
        errors: [
          {
            row: 0,
            field: "_file",
            message: `Row count ${rawRows.length} exceeds limit of ${MAX_ROWS}`,
          },
        ],
      };
    }

    const valid: BulkImportValidRow[] = [];
    const errors: BulkImportRowError[] = [];
    const seenPassports = new Map<string, number>();

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      if (!raw) continue;
      const rowNum = i + 2; // +1 header, +1 one-based
      const normalized = this.normalizeRow(raw);
      const dto = plainToInstance(BulkImportRowDto, normalized);
      const failures = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      if (failures.length > 0) {
        for (const f of failures) {
          errors.push({
            row: rowNum,
            field: f.property,
            message: Object.values(f.constraints ?? {}).join("; ") || "invalid",
          });
        }
        continue;
      }

      const dup = seenPassports.get(dto.passportNo);
      if (dup !== undefined) {
        errors.push({
          row: rowNum,
          field: "passportNo",
          message: `Duplicate of row ${dup} within this file`,
        });
        continue;
      }
      seenPassports.set(dto.passportNo, rowNum);

      valid.push({
        row: rowNum,
        fullName: dto.fullName,
        passportNo: dto.passportNo,
        dob: dto.dob,
        gender: dto.gender,
        nationality: dto.nationality ?? null,
        nationalId: dto.nationalId ?? null,
      });
    }

    if (valid.length > 0) {
      const existing = await db
        .select({ passportNo: pilgrims.passportNo })
        .from(pilgrims)
        .where(
          and(
            eq(pilgrims.agencyId, agencyId),
            isNull(pilgrims.deletedAt),
            inArray(
              pilgrims.passportNo,
              valid.map((v) => v.passportNo),
            ),
          ),
        );
      const existingSet = new Set(existing.map((e) => e.passportNo));
      for (let i = valid.length - 1; i >= 0; i--) {
        const row = valid[i];
        if (row && existingSet.has(row.passportNo)) {
          errors.push({
            row: row.row,
            field: "passportNo",
            message: `Passport ${row.passportNo} already exists in this agency`,
          });
          valid.splice(i, 1);
        }
      }
    }

    return { valid, errors };
  }

  private async parseByMime(
    buffer: Buffer,
    mimetype: string,
  ): Promise<Record<string, unknown>[]> {
    if (CSV_MIME.has(mimetype)) return this.parseCsv(buffer);
    if (XLSX_MIME.has(mimetype)) return this.parseXlsx(buffer);
    throw new Error(`Unsupported mimetype: ${mimetype}`);
  }

  private parseCsv(buffer: Buffer): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, unknown>[] = [];
      Readable.from(buffer)
        .pipe(parse({ headers: true, trim: true, ignoreEmpty: true }))
        .on("error", reject)
        .on("data", (row: Record<string, unknown>) => rows.push(row))
        .on("end", () => resolve(rows));
    });
  }

  private async parseXlsx(buffer: Buffer): Promise<Record<string, unknown>[]> {
    const wb = new ExcelJS.Workbook();
    // Newer @types/node makes Buffer generic (Buffer<ArrayBufferLike>) while
    // exceljs expects the legacy non-generic Buffer type. The runtime value
    // is identical, so strip the generic via Uint8Array.
    await wb.xlsx.load(new Uint8Array(buffer).buffer);
    const sheet = wb.worksheets[0];
    if (!sheet) return [];

    const header = sheet.getRow(1);
    const headers: string[] = [];
    header.eachCell({ includeEmpty: false }, (cell, col) => {
      headers[col - 1] = String(cell.value ?? "").trim();
    });

    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      throw new Error(`XLSX missing required headers: ${missing.join(", ")}`);
    }

    const rows: Record<string, unknown>[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        const key = headers[col - 1];
        if (!key) return;
        const v = cell.value;
        obj[key] =
          v instanceof Date
            ? v.toISOString().slice(0, 10)
            : String(v ?? "").trim();
      });
      if (Object.keys(obj).length > 0) rows.push(obj);
    });
    return rows;
  }

  private normalizeRow(raw: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [rawKey, rawValue] of Object.entries(raw)) {
      const key = rawKey.trim();
      const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
      if (value === "" || value === null || value === undefined) continue;
      if (key === "passportNo" && typeof value === "string") {
        result[key] = value.toUpperCase();
      } else if (key === "gender" && typeof value === "string") {
        result[key] = value.toLowerCase();
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private async writeAudit(
    userId: string,
    agencyId: string,
    inserted: number,
    skipped: number,
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        agencyId,
        userId,
        action: "bulk_import",
        entityType: "pilgrim",
        entityId: null,
        after: { inserted, skipped },
      });
    } catch (err) {
      this.logger.error({ err }, "bulk import audit insert failed");
    }
  }
}
