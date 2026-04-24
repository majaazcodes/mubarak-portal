import { Module } from "@nestjs/common";
import { CacheService } from "../../common/services/cache.service";
import { GroupsController } from "./groups.controller";
import { GroupsRepository } from "./groups.repository";
import { GroupsService } from "./groups.service";

@Module({
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository, CacheService],
  exports: [GroupsService],
})
export class GroupsModule {}
