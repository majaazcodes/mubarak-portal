import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId: string;
  stack?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isProd = process.env.NODE_ENV === "production";

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest & { id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = "Internal Server Error";
    let message: string | string[] = "An unexpected error occurred";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
        error = exception.name.replace(/Exception$/, "");
      } else if (typeof res === "object" && res !== null) {
        const asObj = res as Record<string, unknown>;
        if (typeof asObj.message === "string") {
          message = asObj.message;
        } else if (Array.isArray(asObj.message)) {
          message = asObj.message.filter(
            (m): m is string => typeof m === "string",
          );
        }
        if (typeof asObj.error === "string") {
          error = asObj.error;
        } else {
          error = exception.name.replace(/Exception$/, "");
        }
      }
    }

    const requestId = (request.id as string | undefined) ?? "unknown";
    const body: ErrorBody = {
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    if (!this.isProd && exception instanceof Error && exception.stack) {
      body.stack = exception.stack;
    }

    if (status >= 500) {
      this.logger.error(
        { err: exception, requestId, path: request.url },
        "Unhandled server error",
      );
    }

    void response.status(status).send(body);
  }
}
