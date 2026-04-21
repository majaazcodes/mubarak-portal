import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AccessJwtPayload } from "../../../common/types/jwt-payload.type";
import type { RequestUser } from "../../../common/types/request-user.type";
import { UsersService } from "../../users/users.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly cfg: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: AccessJwtPayload): Promise<RequestUser> {
    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid credentials");
    }
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    if (user.status !== "active") {
      throw new UnauthorizedException("Account disabled");
    }
    if (user.agencyId && user.agencyStatus && user.agencyStatus !== "active") {
      throw new UnauthorizedException("Agency suspended");
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      agencyId: user.agencyId,
    };
  }
}
