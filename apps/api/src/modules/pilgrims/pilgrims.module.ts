import { Module } from "@nestjs/common";
import { CacheService } from "../../common/services/cache.service";
import { PilgrimsController } from "./pilgrims.controller";
import { PilgrimsRepository } from "./pilgrims.repository";
import { PilgrimsService } from "./pilgrims.service";

@Module({
  controllers: [PilgrimsController],
  providers: [PilgrimsService, PilgrimsRepository, CacheService],
  exports: [PilgrimsService, PilgrimsRepository],
})
export class PilgrimsModule {}
