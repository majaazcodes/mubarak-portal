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
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UseGuards } from "@nestjs/common";
import type { RequestUser } from "../../common/types/request-user.type";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { GroupsService } from "./groups.service";
import type { GroupWithPilgrimCount } from "./dto/list-groups.dto";
import type { Group } from "../../db/types";

@UseGuards(RolesGuard)
@Controller("groups")
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Roles("agency_admin", "operator", "viewer")
  @Get()
  async list(
    @CurrentUser() user: RequestUser,
  ): Promise<{ items: GroupWithPilgrimCount[] }> {
    const agencyId = this.requireAgency(user);
    const items = await this.groups.listForAgency(agencyId);
    return { items };
  }

  @Roles("agency_admin", "operator", "viewer")
  @Get(":id")
  async getOne(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<Group> {
    const agencyId = this.requireAgency(user);
    return this.groups.getById(id, agencyId);
  }

  @Roles("agency_admin")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateGroupDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Group> {
    const agencyId = this.requireAgency(user);
    return this.groups.create(dto, agencyId, user.id);
  }

  @Roles("agency_admin")
  @Patch(":id")
  async update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Group> {
    const agencyId = this.requireAgency(user);
    return this.groups.update(id, dto, agencyId, user.id);
  }

  @Roles("agency_admin")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    const agencyId = this.requireAgency(user);
    await this.groups.delete(id, agencyId, user.id);
  }

  private requireAgency(user: RequestUser): string {
    if (!user.agencyId) {
      // super_admin without agency context — not supported for scoped writes
      throw new Error("agency context required");
    }
    return user.agencyId;
  }
}
