import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule, seconds } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { Redis } from "ioredis";
import { LoggerModule } from "nestjs-pino";
import { validateEnv } from "./config/env.validation";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { AuthModule } from "./modules/auth/auth.module";
import { GroupsModule } from "./modules/groups/groups.module";
import { HealthModule } from "./modules/health/health.module";
import { PilgrimsModule } from "./modules/pilgrims/pilgrims.module";
import { QrModule } from "./modules/qr/qr.module";
import { QueuesModule } from "./modules/queues/queues.module";
import { RedisModule } from "./modules/redis/redis.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const isProd = cfg.get<string>("NODE_ENV") === "production";
        const level = cfg.get<string>("LOG_LEVEL") ?? "info";
        return {
          pinoHttp: {
            level,
            transport: isProd
              ? undefined
              : {
                  target: "pino-pretty",
                  options: {
                    colorize: true,
                    singleLine: false,
                    translateTime: "SYS:HH:MM:ss.l",
                    ignore: "pid,hostname,req,res,responseTime",
                    messageFormat: "{context} {msg}",
                  },
                },
            redact: {
              paths: [
                "password",
                "passwordHash",
                "password_hash",
                "accessToken",
                "refreshToken",
                "authorization",
                "req.headers.authorization",
                "req.headers.cookie",
                'res.headers["set-cookie"]',
              ],
              censor: "[REDACTED]",
            },
            customProps: (req) => ({
              requestId: (req as { id?: string }).id ?? undefined,
            }),
            serializers: {
              req: (req) => ({
                id: (req as { id?: string }).id,
                method: (req as { method: string }).method,
                url: (req as { url: string }).url,
              }),
              res: (res) => ({
                statusCode: (res as { statusCode: number }).statusCode,
              }),
            },
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const redis = new Redis(cfg.getOrThrow<string>("REDIS_URL"), {
          maxRetriesPerRequest: 3,
        });
        return {
          throttlers: [{ name: "default", ttl: seconds(60), limit: 100 }],
          storage: new ThrottlerStorageRedisService(redis),
        };
      },
    }),
    RedisModule,
    QueuesModule,
    UsersModule,
    AuthModule,
    QrModule,
    PilgrimsModule,
    GroupsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
