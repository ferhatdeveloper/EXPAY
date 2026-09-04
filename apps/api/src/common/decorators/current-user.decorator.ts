import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '@doviz/shared';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthUser;
  },
);