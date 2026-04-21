import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { RequestUser } from "../types/request-user.type";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: RequestUser;
      params?: Record<string, string>;
    }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException("Authentication required");
    }
    if (user.role === "super_admin") {
      return true;
    }
    const paramAgencyId = request.params?.agencyId;
    if (paramAgencyId && paramAgencyId !== user.agencyId) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return true;
  }
}
