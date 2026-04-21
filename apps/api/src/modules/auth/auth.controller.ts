import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { RequestUser } from "../../common/types/request-user.type";
import {
  AuthService,
  type LoginResult,
  type RefreshResult,
} from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
  ): Promise<LoginResult> {
    return this.authService.login(
      dto.email,
      dto.password,
      req.ip,
      req.headers["user-agent"] ?? undefined,
    );
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: FastifyRequest,
  ): Promise<RefreshResult> {
    return this.authService.refresh(
      dto.refreshToken,
      req.ip,
      req.headers["user-agent"] ?? undefined,
    );
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.authService.logout(
      dto.refreshToken,
      req.ip,
      req.headers["user-agent"] ?? undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: RequestUser): RequestUser {
    return user;
  }
}
