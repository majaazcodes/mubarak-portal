import { Module } from "@nestjs/common";
import { CacheService } from "../../common/services/cache.service";
import { DeviceThrottleGuard } from "../../common/guards/device-throttle.guard";
import { QueuesModule } from "../queues/queues.module";
import { QrController } from "./qr.controller";
import { QrRepository } from "./qr.repository";
import { QrService } from "./qr.service";

@Module({
  imports: [QueuesModule],
  controllers: [QrController],
  providers: [QrService, QrRepository, CacheService, DeviceThrottleGuard],
  exports: [QrService],
})
export class QrModule {}
