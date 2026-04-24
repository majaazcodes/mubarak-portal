import { Injectable, Logger } from "@nestjs/common";
import archiver from "archiver";
import { eq } from "drizzle-orm";
import { PassThrough } from "node:stream";
import {
  PageSizes,
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import QRCode from "qrcode";
import {
  BulkLimitExceededException,
  PilgrimNotFoundException,
  QrRevokedException,
} from "../../common/exceptions/app.exceptions";
import { db } from "../../db/client";
import { agencies, auditLogs } from "../../db/schema";
import type { Agency, QrCode } from "../../db/types";
import type { PilgrimWithGroups } from "../pilgrims/dto/pilgrim-summary.dto";
import { PilgrimsRepository } from "../pilgrims/pilgrims.repository";
import { QrService } from "../qr/qr.service";

const BULK_LIMIT = 500;

// Pre-rasterised QR at this pixel width scales cleanly into a 100pt PDF
// image (4×) with crisp module edges under scanners' auto-focus.
const QR_PNG_WIDTH_PX = 400;

// Slate-900 ~ rgb(15, 23, 42)
const COLOR_HEADER_BG = rgb(0.059, 0.09, 0.165);
const COLOR_HEADER_FG = rgb(1, 1, 1);
const COLOR_TEXT = rgb(0.114, 0.133, 0.18);
const COLOR_MUTED = rgb(0.42, 0.45, 0.5);
const COLOR_AVATAR_BG = rgb(0.93, 0.94, 0.96);

@Injectable()
export class BadgeService {
  private readonly logger = new Logger(BadgeService.name);

  constructor(
    private readonly pilgrims: PilgrimsRepository,
    private readonly qr: QrService,
  ) {}

  async generatePilgrimBadge(
    pilgrimId: string,
    agencyId: string,
    userId: string,
  ): Promise<{ pdf: Buffer; passport: string; fullName: string }> {
    const pilgrim = await this.pilgrims.findByIdInAgency(pilgrimId, agencyId);
    if (!pilgrim) throw new PilgrimNotFoundException();

    const qr = await this.qr.getByPilgrim(pilgrimId);
    if (qr.revokedAt) throw new QrRevokedException();

    const agency = await this.fetchAgency(agencyId);
    const pdf = await this.buildPdf(pilgrim, qr, agency);

    this.writeAudit(userId, agencyId, "badge_generated", pilgrimId, {
      passport: pilgrim.passportNo,
    });

    return { pdf, passport: pilgrim.passportNo, fullName: pilgrim.fullName };
  }

  async generateBulkBadgesZip(
    pilgrimIds: string[],
    agencyId: string,
    userId: string,
  ): Promise<{ zip: Buffer; count: number }> {
    if (pilgrimIds.length > BULK_LIMIT) {
      throw new BulkLimitExceededException(BULK_LIMIT);
    }

    const agency = await this.fetchAgency(agencyId);
    const archive = archiver("zip", { zlib: { level: 6 } });
    const passthrough = new PassThrough();
    archive.pipe(passthrough);

    // Buffer collection runs concurrently with archive assembly so we can
    // finalise once the last entry is appended.
    const chunks: Buffer[] = [];
    const collected = new Promise<Buffer>((resolve, reject) => {
      passthrough.on("data", (c: Buffer) => chunks.push(c));
      passthrough.on("end", () => resolve(Buffer.concat(chunks)));
      passthrough.on("error", reject);
      archive.on("error", reject);
    });

    for (const pilgrimId of pilgrimIds) {
      const pilgrim = await this.pilgrims.findByIdInAgency(pilgrimId, agencyId);
      if (!pilgrim) throw new PilgrimNotFoundException();
      const qr = await this.qr.getByPilgrim(pilgrimId);
      if (qr.revokedAt) throw new QrRevokedException();

      const pdf = await this.buildPdf(pilgrim, qr, agency);
      archive.append(pdf, { name: `badge-${pilgrim.passportNo}.pdf` });
    }
    await archive.finalize();
    const zip = await collected;

    this.writeAudit(userId, agencyId, "bulk_badges_generated", null, {
      count: pilgrimIds.length,
      pilgrimIds,
    });

    return { zip, count: pilgrimIds.length };
  }

  private async fetchAgency(agencyId: string): Promise<Agency> {
    const rows = await db
      .select()
      .from(agencies)
      .where(eq(agencies.id, agencyId))
      .limit(1);
    const row = rows[0];
    if (!row) {
      // Agency row missing for a logged-in user means account state is
      // corrupt — the JWT wouldn't have been issued otherwise.
      throw new Error("agency row missing for authenticated user");
    }
    return row;
  }

  private async buildPdf(
    pilgrim: PilgrimWithGroups,
    qr: QrCode,
    agency: Agency,
  ): Promise<Buffer> {
    const doc = await PDFDocument.create();
    doc.setTitle(`Badge — ${pilgrim.fullName}`);
    doc.setSubject("Hajj 1447 / 2026");
    doc.setCreator("Mubarak Portal");
    doc.setProducer("Mubarak Portal");

    const page = doc.addPage(PageSizes.A6);
    const { width, height } = page.getSize();

    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

    this.drawHeader(page, width, height, agency, helv, helvBold);
    this.drawIdentity(page, pilgrim, helv, helvBold);
    await this.drawQr(doc, page, width, qr.token, helv);
    this.drawFooter(page, width, pilgrim, agency, helv);

    const bytes = await doc.save();
    return Buffer.from(bytes);
  }

  private drawHeader(
    page: PDFPage,
    width: number,
    height: number,
    agency: Agency,
    helv: PDFFont,
    helvBold: PDFFont,
  ): void {
    const bandHeight = 52;
    page.drawRectangle({
      x: 0,
      y: height - bandHeight,
      width,
      height: bandHeight,
      color: COLOR_HEADER_BG,
    });
    const title = agency.name.toUpperCase();
    const titleFit = this.truncate(title, helvBold, 16, width - 24);
    const titleWidth = helvBold.widthOfTextAtSize(titleFit, 16);
    page.drawText(titleFit, {
      x: (width - titleWidth) / 2,
      y: height - 26,
      size: 16,
      font: helvBold,
      color: COLOR_HEADER_FG,
    });
    const sub = "Hajj 1447 / 2026";
    const subWidth = helv.widthOfTextAtSize(sub, 10);
    page.drawText(sub, {
      x: (width - subWidth) / 2,
      y: height - 44,
      size: 10,
      font: helv,
      color: COLOR_HEADER_FG,
    });
  }

  private drawIdentity(
    page: PDFPage,
    pilgrim: PilgrimWithGroups,
    helv: PDFFont,
    helvBold: PDFFont,
  ): void {
    // Avatar circle with initials.
    const cx = 40;
    const cy = 310;
    page.drawCircle({ x: cx, y: cy, size: 20, color: COLOR_AVATAR_BG });
    const init = this.initials(pilgrim.fullName);
    const initWidth = helvBold.widthOfTextAtSize(init, 14);
    page.drawText(init, {
      x: cx - initWidth / 2,
      y: cy - 5,
      size: 14,
      font: helvBold,
      color: COLOR_TEXT,
    });

    const textX = cx + 32;
    const maxTextWidth = page.getWidth() - textX - 12;

    const name = this.truncate(pilgrim.fullName, helvBold, 14, maxTextWidth);
    page.drawText(name, {
      x: textX,
      y: cy + 6,
      size: 14,
      font: helvBold,
      color: COLOR_TEXT,
    });
    page.drawText(`Passport: ${pilgrim.passportNo}`, {
      x: textX,
      y: cy - 8,
      size: 10,
      font: helv,
      color: COLOR_TEXT,
    });

    const metaParts: string[] = [];
    metaParts.push(this.titleCase(pilgrim.gender));
    if (pilgrim.dob) metaParts.push(`DOB ${pilgrim.dob}`);
    if (pilgrim.nationality) metaParts.push(pilgrim.nationality);
    if (metaParts.length > 0) {
      page.drawText(metaParts.join("  •  "), {
        x: textX,
        y: cy - 22,
        size: 9,
        font: helv,
        color: COLOR_MUTED,
      });
    }

    const groupName = pilgrim.groups[0]?.name ?? "Unassigned";
    page.drawText(`Group: ${groupName}`, {
      x: textX,
      y: cy - 38,
      size: 10,
      font: helvBold,
      color: COLOR_TEXT,
    });
  }

  private async drawQr(
    doc: PDFDocument,
    page: PDFPage,
    width: number,
    token: string,
    helv: PDFFont,
  ): Promise<void> {
    const pngBuffer = await QRCode.toBuffer(token, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: QR_PNG_WIDTH_PX,
      type: "png",
    });
    const image = await doc.embedPng(pngBuffer);
    const size = 108;
    page.drawImage(image, {
      x: (width - size) / 2,
      y: 110,
      width: size,
      height: size,
    });
    const caption = "Scan to verify pilgrim identity";
    const capWidth = helv.widthOfTextAtSize(caption, 8);
    page.drawText(caption, {
      x: (width - capWidth) / 2,
      y: 95,
      size: 8,
      font: helv,
      color: COLOR_MUTED,
    });
  }

  private drawFooter(
    page: PDFPage,
    width: number,
    pilgrim: PilgrimWithGroups,
    agency: Agency,
    helv: PDFFont,
  ): void {
    const parts: string[] = [];
    if (agency.contactPhone) parts.push(`Agency: ${agency.contactPhone}`);
    const ec = pilgrim.emergencyContact;
    if (ec?.phone) parts.push(`Emergency: ${ec.phone}`);
    if (parts.length === 0) return;
    const text = parts.join("  •  ");
    const fit = this.truncate(text, helv, 8, width - 24);
    const textWidth = helv.widthOfTextAtSize(fit, 8);
    page.drawText(fit, {
      x: (width - textWidth) / 2,
      y: 40,
      size: 8,
      font: helv,
      color: COLOR_MUTED,
    });
  }

  private initials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const take = parts.slice(0, 2);
    return take.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  }

  private titleCase(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // pdf-lib's drawText does not wrap; clip with an ellipsis so long names
  // don't bleed off the page edge.
  private truncate(
    text: string,
    font: PDFFont,
    size: number,
    maxWidth: number,
  ): string {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    const ell = "…";
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      const candidate = text.slice(0, mid) + ell;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return text.slice(0, lo) + ell;
  }

  private writeAudit(
    userId: string,
    agencyId: string,
    action: string,
    entityId: string | null,
    after: Record<string, unknown>,
  ): void {
    db.insert(auditLogs)
      .values({
        agencyId,
        userId,
        action,
        entityType: "badge",
        entityId,
        after,
      })
      .catch((err: unknown) => {
        this.logger.warn({ err, action }, "badge audit insert failed");
      });
  }
}
