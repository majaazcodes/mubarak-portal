import { Module } from "@nestjs/common";
import { PilgrimsModule } from "../pilgrims/pilgrims.module";
import { QrModule } from "../qr/qr.module";
import { BadgeController } from "./badge.controller";
import { BadgeService } from "./badge.service";

@Module({
  imports: [PilgrimsModule, QrModule],
  controllers: [BadgeController],
  providers: [BadgeService],
})
export class BadgesModule {}
