import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { type Observable, tap } from "rxjs";
import { db } from "../../db/client";
import { auditLogs } from "../../db/schema";
import type { RequestUser } from "../types/request-user.type";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function actionFromMethod(method: string): string {
  switch (method) {
    case "POST":
      return "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return method.toLowerCase();
  }
}

function entityTypeFromUrl(url: string): string {
  const prefix = "/api/v1/";
  const afterPrefix = url.startsWith(prefix) ? url.slice(prefix.length) : url;
  const first = afterPrefix.split("?")[0]?.split("/")[0] ?? "unknown";
  if (!first) return "unknown";
  return first.endsWith("s") ? first.slice(0, -1) : first;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        user?: RequestUser;
        id?: string;
        params?: Record<string, string>;
      }
    >();

    const method = request.method;
    if (!MUTATION_METHODS.has(method)) {
      return next.handle();
    }

    // Skip auth endpoints — they write their own audit rows with domain-specific actions.
    if (request.url.startsWith("/api/v1/auth/")) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((response: unknown) => {
        const user = request.user;
        const entityId =
          request.params?.id ??
          (response &&
          typeof response === "object" &&
          "id" in response &&
          typeof (response as { id: unknown }).id === "string"
            ? (response as { id: string }).id
            : null);

        db.insert(auditLogs)
          .values({
            agencyId: user?.agencyId ?? null,
            userId: user?.id ?? null,
            action: actionFromMethod(method),
            entityType: entityTypeFromUrl(request.url),
            entityId,
            ip: request.ip,
            userAgent: request.headers["user-agent"] ?? null,
          })
          .catch((err: unknown) => {
            this.logger.error(
              { err, requestId: request.id, url: request.url },
              "audit insert failed",
            );
          });
      }),
    );
  }
}
