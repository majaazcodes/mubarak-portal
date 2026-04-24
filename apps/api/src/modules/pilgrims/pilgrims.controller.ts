import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { RequestUser } from "../../common/types/request-user.type";
import type { Pilgrim } from "../../db/types";
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
  constructor(private readonly pilgrims: PilgrimsService) {}

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
  ): Promise<{ pilgrim: Pilgrim }> {
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

  private requireAgency(user: RequestUser): string {
    if (!user.agencyId) {
      throw new Error("agency context required");
    }
    return user.agencyId;
  }
}
