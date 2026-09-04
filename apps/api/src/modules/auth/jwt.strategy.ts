import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from "@doviz/shared";

interface JwtPayload {
  sub: string;
  username: string;
  roleCode: string;
  permissions: string[];
  branchIds: string[];
  defaultBranchId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-secret',
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      username: payload.username,
      roleId: '',
      roleCode: payload.roleCode,
      permissions: payload.permissions ?? [],
      branchIds: payload.branchIds ?? [],
      defaultBranchId: payload.defaultBranchId,
      language: 'tr',
    };
  }
}