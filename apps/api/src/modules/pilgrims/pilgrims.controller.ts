import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { RequestUser } from "../../common/types/request-user.type";
import type { Pilgrim } from "../../db/types";
import { BulkImportService } from "./bulk-import.service";
import type {
  BulkImportPreview,
  BulkImportResult,
} from "./dto/bulk-import.dto";
import { CreatePilgrimDto } from "./dto/create-pilgrim.dto";
import { ListPilgrimsDto } from "./dto/list-pilgrims.dto";
import { UpdatePilgrimDto } from "./dto/update-pilgrim.dto";
import type {
  PilgrimListResponse,
  PilgrimWithGroups,
} from "./dto/pilgrim-summary.dto";
import { PilgrimsService } from "./pilgrims.service";

@UseGuards(RolesGuard)
@Controller("pilgrims")
export class PilgrimsController {
  constructor(
    private readonly pilgrims: PilgrimsService,
    private readonly bulkImport: BulkImportService,
  ) {}

  @Roles("agency_admin", "operator", "viewer")
  @Get()
  async list(
    @Query() query: ListPilgrimsDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PilgrimListResponse> {
    const agencyId = this.requireAgency(user);
    return this.pilgrims.list(query, agencyId);
  }

  @Roles("agency_admin", "operator", "viewer")
  @Get(":id")
  async getOne(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<PilgrimWithGroups> {
    const agencyId = this.requireAgency(user);
    return this.pilgrims.getById(id, agencyId, user.id);
  }

  @Roles("agency_admin")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePilgrimDto,
    @CurrentUser() user: RequestUser,
  ): Promise<{ pilgrim: Pilgrim; qrToken: string }> {
    const agencyId = this.requireAgency(user);
    return this.pilgrims.create(dto, agencyId, user.id);
  }

  @Roles("agency_admin")
  @Patch(":id")
  async update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdatePilgrimDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Pilgrim> {
    const agencyId = this.requireAgency(user);
    return this.pilgrims.update(id, dto, agencyId, user.id);
  }

  @Roles("agency_admin")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    const agencyId = this.requireAgency(user);
    await this.pilgrims.delete(id, agencyId, user.id);
  }

  @Roles("agency_admin")
  @Post("bulk-import")
  @HttpCode(HttpStatus.OK)
  async bulkImportFile(
    @Req() req: FastifyRequest,
    @CurrentUser() user: RequestUser,
  ): Promise<BulkImportPreview | BulkImportResult> {
    const agencyId = this.requireAgency(user);

    // @fastify/multipart augments FastifyRequest with isMultipart/file at
    // runtime. The augmentation isn't always picked up by Nest's controller
    // typing, so cast here — file() returns MultipartFile | undefined.
    const mp = req as FastifyRequest & {
      isMultipart: () => boolean;
      file: () => Promise<
        | {
            filename: string;
            mimetype: string;
            toBuffer: () => Promise<Buffer>;
            fields: Record<string, unknown>;
          }
        | undefined
      >;
    };

    if (typeof mp.isMultipart !== "function" || !mp.isMultipart()) {
      throw new BadRequestException({
        error: "MULTIPART_REQUIRED",
        message: "Content-Type must be multipart/form-data",
      });
    }

    let file;
    try {
      file = await mp.file();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "FST_REQ_FILE_TOO_LARGE") {
        throw new PayloadTooLargeException({
          error: "FILE_TOO_LARGE",
          message: "File exceeds 5 MB limit",
        });
      }
      throw err;
    }
    if (!file) {
      throw new BadRequestException({
        error: "FILE_MISSING",
        message: "No file uploaded in multipart body",
      });
    }

    const buffer = await file.toBuffer();

    const confirmField = file.fields?.confirm;
    const confirmFromField = this.extractFieldValue(confirmField);
    const confirmFromQuery =
      typeof req.query === "object" &&
      req.query !== null &&
      "confirm" in req.query
        ? (req.query as { confirm?: unknown }).confirm
        : undefined;
    const confirm = confirmFromField === "true" || confirmFromQuery === "true";

    if (confirm) {
      return this.bulkImport.commit(buffer, file.mimetype, agencyId, user.id);
    }
    return this.bulkImport.validate(buffer, file.mimetype, agencyId);
  }

  private extractFieldValue(field: unknown): unknown {
    if (!field || typeof field !== "object") return undefined;
    const first = Array.isArray(field) ? field[0] : field;
    if (!first || typeof first !== "object") return undefined;
    return (first as { value?: unknown }).value;
  }

  private requireAgency(user: RequestUser): string {
    if (!user.agencyId) {
      throw new Error("agency context required");
    }
    return user.agencyId;
  }
}
