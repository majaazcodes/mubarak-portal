import "reflect-metadata";
import "dotenv/config";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyMultipart from "@fastify/multipart";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { registerRequestId } from "./common/middleware/request-id.middleware";
import { closeDb } from "./db/client";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, logger: false }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  const cfg = app.get(ConfigService);
  const log = app.get(Logger);

  // Split on commas so we can allow multiple dev origins (admin web at
  // localhost + LAN IP, plus exp://… for the Expo dev client).
  const corsOrigin = cfg
    .getOrThrow<string>("CORS_ORIGIN")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const port = Number(cfg.getOrThrow<number>("PORT"));
  // Bind to 0.0.0.0 (not 127.0.0.1) so the Expo dev client on a phone
  // sharing the LAN can reach the laptop's IP at this port.
  const host = cfg.getOrThrow<string>("HOST");
  const nodeEnv = cfg.getOrThrow<string>("NODE_ENV");

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
  await app.register(fastifyCors, {
    origin: corsOrigin,
    credentials: true,
  });
  // Multipart for bulk CSV/XLSX imports. attachFieldsToBody defaults to false,
  // so JSON routes are unaffected — controller pulls the file via req.file().
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
      files: 1,
      fields: 5,
    },
  });

  registerRequestId(app.getHttpAdapter().getInstance());

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableShutdownHooks();

  const shutdown = async (signal: string): Promise<void> => {
    log.log(`[api] received ${signal} — shutting down...`);
    try {
      await app.close();
      await closeDb();
      log.log("[api] bye");
      process.exit(0);
    } catch (err) {
      log.error({ err }, "[api] shutdown error");
      process.exit(1);
    }
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));

  await app.listen(port, host);
  log.log(`🚀 API listening on http://${host}:${port}/api/v1 [env=${nodeEnv}]`);
}

bootstrap().catch((err: unknown) => {
  console.error("[api] failed to bootstrap", err);
  process.exit(1);
});
