import { Module } from "@nestjs/common";
import { CacheService } from "../../common/services/cache.service";
import { QrModule } from "../qr/qr.module";
import { BulkImportService } from "./bulk-import.service";
import { PilgrimsController } from "./pilgrims.controller";
import { PilgrimsRepository } from "./pilgrims.repository";
import { PilgrimsService } from "./pilgrims.service";

@Module({
  imports: [QrModule],
  controllers: [PilgrimsController],
  providers: [
    PilgrimsService,
    PilgrimsRepository,
    BulkImportService,
    CacheService,
  ],
  exports: [PilgrimsService, PilgrimsRepository],
})
export class PilgrimsModule {}
