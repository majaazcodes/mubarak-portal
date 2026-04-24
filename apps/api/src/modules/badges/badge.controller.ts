import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { FastifyReply } from "fastify";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { RequestUser } from "../../common/types/request-user.type";
import { BadgeService } from "./badge.service";
import { BulkBadgesDto } from "./dto/bulk-badges.dto";

@UseGuards(RolesGuard)
@Controller("badges")
export class BadgeController {
  constructor(private readonly badges: BadgeService) {}

  // Single badge — allow viewers too; they can already see the pilgrim.
  @Roles("agency_admin", "operator", "viewer")
  @Get("pilgrim/:pilgrimId")
  async getPilgrimBadge(
    @Param("pilgrimId", new ParseUUIDPipe({ version: "4" })) pilgrimId: string,
    @CurrentUser() user: RequestUser,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const agencyId = this.requireAgency(user);
    const { pdf, passport } = await this.badges.generatePilgrimBadge(
      pilgrimId,
      agencyId,
      user.id,
    );
    reply
      .header("content-type", "application/pdf")
      .header(
        "content-disposition",
        `attachment; filename="badge-${passport}.pdf"`,
      )
      .header("cache-control", "private, no-store")
      .send(pdf);
  }

  // Bulk is more expensive — tighter throttle + admin/operator only.
  @Roles("agency_admin", "operator")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("bulk")
  async getBulkBadges(
    @Body() dto: BulkBadgesDto,
    @CurrentUser() user: RequestUser,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const agencyId = this.requireAgency(user);
    const { zip } = await this.badges.generateBulkBadgesZip(
      dto.pilgrimIds,
      agencyId,
      user.id,
    );
    const stamp = timestampStamp();
    reply
      .header("content-type", "application/zip")
      .header(
        "content-disposition",
        `attachment; filename="badges-${stamp}.zip"`,
      )
      .header("cache-control", "private, no-store")
      .send(zip);
  }

  private requireAgency(user: RequestUser): string {
    if (!user.agencyId) {
      throw new Error("agency context required");
    }
    return user.agencyId;
  }
}

// yyyy-MM-dd-HHmmss in UTC (consistent across clients/timezones)
function timestampStamp(): string {
  const d = new Date();
  const pad = (n: number): string => n.toString().padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}
