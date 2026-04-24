import {
  BadRequestException,
  CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RedisService } from "../../modules/redis/redis.service";

export const DEVICE_THROTTLE_LIMIT_KEY = "deviceThrottleLimit";
export const DEVICE_THROTTLE_WINDOW_KEY = "deviceThrottleWindow";

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_SEC = 1;

interface ThrottleableRequest {
  body?: { deviceId?: unknown } | unknown;
  headers?: Record<string, string | string[] | undefined>;
  url?: string;
}

@Injectable()
export class DeviceThrottleGuard implements CanActivate {
  private readonly logger = new Logger(DeviceThrottleGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limit =
      this.reflector.getAllAndOverride<number | undefined>(
        DEVICE_THROTTLE_LIMIT_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? DEFAULT_LIMIT;
    const windowSec =
      this.reflector.getAllAndOverride<number | undefined>(
        DEVICE_THROTTLE_WINDOW_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? DEFAULT_WINDOW_SEC;

    const req = context.switchToHttp().getRequest<ThrottleableRequest>();
    const deviceId = this.extractDeviceId(req);
    if (!deviceId) {
      throw new BadRequestException({
        error: "DEVICE_ID_REQUIRED",
        message: "deviceId is required in body or X-Device-Id header",
      });
    }

    const client = this.redis.getClient();
    const bucket = Math.floor(Date.now() / 1000 / windowSec);
    const key = `qr:throttle:${deviceId}:${bucket}`;

    // Atomic INCR + EXPIRE — guaranteed single round-trip.
    const res = await client
      .multi()
      .incr(key)
      .expire(key, windowSec + 1)
      .exec();

    if (!res) {
      // Redis connection issue — fail open to avoid scan outage.
      this.logger.warn(
        { deviceId },
        "device-throttle redis multi returned null",
      );
      return true;
    }

    const count = res[0]?.[1] as number | undefined;
    if (typeof count === "number" && count > limit) {
      throw new HttpException(
        {
          error: "DEVICE_RATE_LIMIT",
          message: `Device ${deviceId} exceeded ${limit} requests per ${windowSec}s`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private extractDeviceId(req: ThrottleableRequest): string | null {
    const body = req.body;
    if (body && typeof body === "object" && "deviceId" in body) {
      const v = (body as { deviceId?: unknown }).deviceId;
      if (typeof v === "string" && v.length > 0 && v.length <= 100) return v;
    }
    const header = req.headers?.["x-device-id"];
    if (
      typeof header === "string" &&
      header.length > 0 &&
      header.length <= 100
    ) {
      return header;
    }
    return null;
  }
}
