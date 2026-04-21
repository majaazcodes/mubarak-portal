import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { FastifyReply } from "fastify";
import { Public } from "../../common/decorators/public.decorator";
import { HealthService, type HealthStatus } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @SkipThrottle()
  @Get()
  async check(@Res() reply: FastifyReply): Promise<void> {
    const result: HealthStatus = await this.health.check();
    const code =
      result.status === "ok" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    void reply.status(code).send(result);
  }
}
