import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { DeviceThrottleGuard } from "../../common/guards/device-throttle.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { RequestUser } from "../../common/types/request-user.type";
import type { QrCode } from "../../db/types";
import { BulkSyncScansDto } from "./dto/bulk-sync-scans.dto";
import { QrLookupDto } from "./dto/qr-lookup.dto";
import type { QrLookupResponse } from "./dto/qr-lookup-response.dto";
import { QrService } from "./qr.service";

// QR lookup is the mobile-scan hot path; per-device throttling happens in
// DeviceThrottleGuard. The global IP throttler (tuned for auth) would cap
// all concurrent scans at 100/min across an agency's whole field team.
@SkipThrottle()
@UseGuards(RolesGuard)
@Controller("qr")
export class QrController {
  constructor(private readonly qr: QrService) {}

  @Roles("agency_admin", "operator", "viewer")
  @UseGuards(DeviceThrottleGuard)
  @Post("lookup")
  @HttpCode(HttpStatus.OK)
  async lookup(
    @Body() dto: QrLookupDto,
    @CurrentUser() user: RequestUser,
  ): Promise<QrLookupResponse> {
    return this.qr.lookup(dto, user);
  }

  @Roles("agency_admin", "operator")
  @UseGuards(DeviceThrottleGuard)
  @Post("bulk-sync-scans")
  @HttpCode(HttpStatus.OK)
  async bulkSync(
    @Body() dto: BulkSyncScansDto,
    @CurrentUser() user: RequestUser,
  ): Promise<{
    accepted: number;
    rejected: { index: number; error: string }[];
  }> {
    return this.qr.bulkSync(dto, user);
  }

  @Roles("agency_admin", "operator", "viewer")
  @Get(":pilgrimId")
  async getByPilgrim(
    @Param("pilgrimId", new ParseUUIDPipe({ version: "4" })) pilgrimId: string,
  ): Promise<QrCode> {
    return this.qr.getByPilgrim(pilgrimId);
  }

  @Roles("agency_admin")
  @Post(":pilgrimId/regenerate")
  @HttpCode(HttpStatus.OK)
  async regenerate(
    @Param("pilgrimId", new ParseUUIDPipe({ version: "4" })) pilgrimId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<QrCode> {
    const agencyId = user.agencyId;
    if (!agencyId) {
      throw new Error("agency context required");
    }
    return this.qr.regenerate(pilgrimId, agencyId, user.id);
  }
}
