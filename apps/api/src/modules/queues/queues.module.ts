import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { SCAN_LOGS_QUEUE } from "./queues.constants";
import { ScanLogProducer } from "./scan-log.producer";
import { ScanLogProcessor } from "./scan-log.processor";

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          // BullMQ REQUIRES maxRetriesPerRequest: null on the ioredis connection
          // or the worker throws "maxRetriesPerRequest must be null" at startup.
          url: cfg.getOrThrow<string>("REDIS_URL"),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({
      name: SCAN_LOGS_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }),
  ],
  providers: [ScanLogProducer, ScanLogProcessor],
  exports: [ScanLogProducer],
})
export class QueuesModule {}
