import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserRole, UserStatus } from '@navrix/types';
import { PrismaService } from '../prisma.service';
import { AppException } from '../errors/app.exception';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser; cookies?: Record<string, string> }>();

    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.cookies?.navrix_access_token) {
      token = req.cookies.navrix_access_token;
    }

    if (!token) {
      throw new AppException(
        'AUTH_REQUIRED',
        'Authentication is required to access this resource.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let payload: { sub: string; uid: string; role: UserRole };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret:
          process.env.JWT_SECRET ||
          'dev_only_fallback_jwt_secret_replace_in_production_32b',
      });
    } catch {
      throw new AppException(
        'INVALID_OR_EXPIRED_TOKEN',
        'Your session token is invalid or has expired. Please sign in again.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        publicUid: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppException(
        'USER_NOT_FOUND',
        'Account associated with this session no longer exists.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppException(
        'ACCOUNT_SUSPENDED',
        'This account has been suspended. Please contact compliance support.',
        HttpStatus.FORBIDDEN,
      );
    }

    req.user = {
      id: user.id,
      publicUid: user.publicUid,
      email: user.email,
      name: user.name,
      role: user.role as unknown as UserRole,
      status: user.status as unknown as UserStatus,
    };

    return true;
  }
}

