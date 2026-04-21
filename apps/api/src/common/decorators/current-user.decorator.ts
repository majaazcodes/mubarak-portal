import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { RequestUser } from "../types/request-user.type";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    return request.user;
  },
);
