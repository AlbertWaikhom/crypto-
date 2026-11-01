import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole, UserStatus } from '@navrix/types';

export interface AuthenticatedUser {
  id: string;
  publicUid: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);

