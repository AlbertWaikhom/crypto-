import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { nextReadableUid, Prisma, UserRole, UserStatus } from '@navrix/database';
import { AuditAction, isAdminRole, PublicUserDto } from '@navrix/types';
import { passwordPolicySchema } from '@navrix/validation';
import { PrismaService } from '../common/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { AuditService } from '../audit/audit.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './auth.dto';

interface RequestContextMeta {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private toPublicUser(user: {
    publicUid: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    emailVerified: boolean;
    avatarUrl: string | null;
    twoFactorEnabled: boolean;
    createdAt: Date;
  }): PublicUserDto {
    return {
      uid: user.publicUid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role as PublicUserDto['role'],
      status: user.status as PublicUserDto['status'],
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async register(dto: RegisterDto, meta: RequestContextMeta) {
    if (!dto.acceptTerms) {
      throw new AppException(
        'TERMS_NOT_ACCEPTED',
        'You must accept the platform Terms & Risk Disclosure to register.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const pwdCheck = passwordPolicySchema.safeParse(dto.password);
    if (!pwdCheck.success) {
      throw new AppException(
        'WEAK_PASSWORD',
        pwdCheck.error.issues[0]?.message || 'Password does not meet security policy.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new AppException(
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email address already exists.',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();

    const createdUser = await this.prisma.$transaction(async (tx) => {
      const publicUid = await nextReadableUid(tx, 'USR', false);
      const user = await tx.user.create({
        data: {
          publicUid,
          name: dto.name.trim(),
          email: normalizedEmail,
          phone: dto.phone?.trim() || null,
          passwordHash,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          emailVerified: false,
          lastLoginAt: now,
          wallets: {
            create: {
              asset: 'USDT',
              availableBalance: new Prisma.Decimal(0),
              lockedBalance: new Prisma.Decimal(0),
              investedBalance: new Prisma.Decimal(0),
              pendingWithdrawal: new Prisma.Decimal(0),
            },
          },
          complianceProfile: {
            create: {
              country: dto.country?.trim() || null,
              termsAcceptedAt: now,
              privacyAcceptedAt: now,
              riskDisclosureAcceptedAt: now,
            },
          },
          authTokens: {
            create: {
              tokenType: 'EMAIL_VERIFY',
              tokenHash: this.hashToken(rawVerifyToken),
              expiresAt: new Date(Date.now() + 24 * 3600_000),
            },
          },
        },
      });
      return user;
    });

    const tokens = await this.issueSessionTokens(createdUser, meta);
    return {
      user: this.toPublicUser(createdUser),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      verificationTokenPreview:
        process.env.NODE_ENV !== 'production' ? rawVerifyToken : undefined,
    };
  }

  async login(dto: LoginDto, meta: RequestContextMeta) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Invalid email or password.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppException(
        'ACCOUNT_TEMPORARILY_LOCKED',
        'Too many failed login attempts. Account is temporarily locked for 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      const nextCount = user.failedLoginCount + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: nextCount,
          lockedUntil:
            nextCount >= 5 ? new Date(Date.now() + 15 * 60_000) : user.lockedUntil,
        },
      });
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Invalid email or password.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppException(
        'ACCOUNT_SUSPENDED',
        'Your account is suspended. Please contact support.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (dto.requireAdmin && !isAdminRole(user.role)) {
      throw new AppException(
        'ADMIN_ACCESS_DENIED',
        'Administrative privileges are required to sign into the Admin Portal.',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    if (isAdminRole(user.role)) {
      await this.auditService.record({
        adminId: user.id,
        actorRole: user.role,
        action: AuditAction.ADMIN_LOGIN,
        targetType: 'USER',
        targetId: user.publicUid,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    const tokens = await this.issueSessionTokens(user, meta);
    return {
      user: this.toPublicUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Google OAuth 2.0 Login / Registration:
   * - GOOGLE_OAUTH_MODE=LIVE: Validates Google ID token against Google's tokeninfo endpoint & GOOGLE_CLIENT_ID
   * - GOOGLE_OAUTH_MODE=MOCK: Deterministic local development Google sign-in without requiring live Google Console keys
   */
  async loginWithGoogle(dto: GoogleAuthDto, meta: RequestContextMeta) {
    const mode = (process.env.GOOGLE_OAUTH_MODE || 'MOCK').toUpperCase();
    let googleSub: string;
    let email: string;
    let name: string;
    let avatarUrl: string | null = null;

    if (mode === 'LIVE') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new AppException(
          'GOOGLE_OAUTH_NOT_CONFIGURED',
          'Google OAuth Client ID is not configured on the server.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
          dto.idToken,
        )}`,
      );
      if (!verifyRes.ok) {
        throw new AppException(
          'INVALID_GOOGLE_TOKEN',
          'Google identity token verification failed.',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const tokenInfo = (await verifyRes.json()) as {
        sub?: string;
        email?: string;
        email_verified?: string;
        name?: string;
        picture?: string;
        aud?: string;
      };

      if (
        tokenInfo.aud !== clientId ||
        tokenInfo.email_verified !== 'true' ||
        !tokenInfo.email ||
        !tokenInfo.sub
      ) {
        throw new AppException(
          'GOOGLE_TOKEN_AUDIENCE_MISMATCH',
          'Google token audience or email verification check failed.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      googleSub = tokenInfo.sub;
      email = tokenInfo.email.toLowerCase();
      name = tokenInfo.name || email.split('@')[0]!;
      avatarUrl = tokenInfo.picture || null;
    } else {
      // Safe deterministic MOCK mode for local development & E2E tests
      email = (dto.email || 'google.investor@navrix.local').trim().toLowerCase();
      name = (dto.name || 'Google Verified User').trim();
      googleSub = `mock_google_${this.hashToken(email).slice(0, 24)}`;
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleSub }, { email }],
      },
    });

    if (!user) {
      if (dto.requireAdmin) {
        throw new AppException(
          'ADMIN_ACCESS_DENIED',
          'No authorized administrator account matches this Google identity.',
          HttpStatus.FORBIDDEN,
        );
      }

      const now = new Date();
      user = await this.prisma.$transaction(async (tx) => {
        const publicUid = await nextReadableUid(tx, 'USR', false);
        return tx.user.create({
          data: {
            publicUid,
            name,
            email,
            googleId: googleSub,
            avatarUrl,
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            emailVerified: true,
            emailVerifiedAt: now,
            lastLoginAt: now,
            wallets: {
              create: {
                asset: 'USDT',
                availableBalance: new Prisma.Decimal(0),
                lockedBalance: new Prisma.Decimal(0),
                investedBalance: new Prisma.Decimal(0),
                pendingWithdrawal: new Prisma.Decimal(0),
              },
            },
            complianceProfile: {
              create: {
                termsAcceptedAt: now,
                privacyAcceptedAt: now,
                riskDisclosureAcceptedAt: now,
              },
            },
          },
        });
      });
    } else {
      if (user.status === UserStatus.SUSPENDED) {
        throw new AppException(
          'ACCOUNT_SUSPENDED',
          'Your account has been suspended.',
          HttpStatus.FORBIDDEN,
        );
      }
      if (dto.requireAdmin && !isAdminRole(user.role)) {
        throw new AppException(
          'ADMIN_ACCESS_DENIED',
          'Administrative privileges are required to sign into the Admin Portal.',
          HttpStatus.FORBIDDEN,
        );
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleSub,
          emailVerified: true,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
          avatarUrl: user.avatarUrl || avatarUrl,
          lastLoginAt: new Date(),
        },
      });
    }

    if (isAdminRole(user.role)) {
      await this.auditService.record({
        adminId: user.id,
        actorRole: user.role,
        action: AuditAction.ADMIN_LOGIN,
        targetType: 'USER',
        targetId: user.publicUid,
        newValue: { method: 'GOOGLE_OAUTH' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    const tokens = await this.issueSessionTokens(user, meta);
    return {
      user: this.toPublicUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async rotateRefreshToken(rawRefreshToken: string, meta: RequestContextMeta) {
    if (!rawRefreshToken) {
      throw new AppException(
        'REFRESH_TOKEN_MISSING',
        'Refresh token is missing.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new AppException(
        'INVALID_REFRESH_TOKEN',
        'Refresh token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Reuse detection: if an already-revoked token is replayed, revoke the entire token family!
    if (session.revokedAt) {
      await this.prisma.userSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AppException(
        'REFRESH_TOKEN_REUSE_DETECTED',
        'Session invalidated for security due to refresh token replay.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (session.expiresAt < new Date()) {
      throw new AppException(
        'REFRESH_TOKEN_EXPIRED',
        'Session expired. Please sign in again.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (session.user.status === UserStatus.SUSPENDED) {
      throw new AppException(
        'ACCOUNT_SUSPENDED',
        'Account is suspended.',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueSessionTokens(
      session.user,
      meta,
      session.familyId,
    );
    return {
      user: this.toPublicUser(session.user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(rawRefreshToken?: string, userId?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.prisma.userSession.updateMany({
        where: { refreshTokenHash: tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else if (userId) {
      await this.prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { loggedOut: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    let devTokenPreview: string | undefined;

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      devTokenPreview =
        process.env.NODE_ENV !== 'production' ? rawToken : undefined;
      await this.prisma.authToken.create({
        data: {
          userId: user.id,
          tokenType: 'PASSWORD_RESET',
          tokenHash: this.hashToken(rawToken),
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
    }

    return {
      message:
        'If an account exists for that email address, password reset instructions have been issued.',
      resetTokenPreview: devTokenPreview,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const pwdCheck = passwordPolicySchema.safeParse(dto.newPassword);
    if (!pwdCheck.success) {
      throw new AppException(
        'WEAK_PASSWORD',
        pwdCheck.error.issues[0]?.message || 'Password does not meet security policy.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const tokenHash = this.hashToken(dto.token.trim());
    const authToken = await this.prisma.authToken.findUnique({
      where: { tokenHash },
    });

    if (
      !authToken ||
      authToken.tokenType !== 'PASSWORD_RESET' ||
      authToken.usedAt ||
      authToken.expiresAt < new Date()
    ) {
      throw new AppException(
        'INVALID_OR_EXPIRED_RESET_TOKEN',
        'Password reset token is invalid or has expired.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: authToken.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      }),
      this.prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.userSession.updateMany({
        where: { userId: authToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { passwordReset: true };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = this.hashToken(rawToken.trim());
    const authToken = await this.prisma.authToken.findUnique({
      where: { tokenHash },
    });

    if (
      !authToken ||
      authToken.tokenType !== 'EMAIL_VERIFY' ||
      authToken.usedAt ||
      authToken.expiresAt < new Date()
    ) {
      throw new AppException(
        'INVALID_VERIFICATION_TOKEN',
        'Email verification token is invalid or has expired.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: authToken.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
      this.prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { emailVerified: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const pwdCheck = passwordPolicySchema.safeParse(dto.newPassword);
    if (!pwdCheck.success) {
      throw new AppException(
        'WEAK_PASSWORD',
        pwdCheck.error.issues[0]?.message || 'Password does not meet security policy.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash) {
      const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!ok) {
        throw new AppException(
          'INVALID_CURRENT_PASSWORD',
          'Current password is incorrect.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { passwordChanged: true };
  }

  async listSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  private async issueSessionTokens(
    user: { id: string; publicUid: string; role: string },
    meta: RequestContextMeta,
    existingFamilyId?: string,
  ) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      uid: user.publicUid,
      role: user.role,
    });

    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const refreshDays = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 7);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hashToken(rawRefreshToken),
        familyId: existingFamilyId || crypto.randomUUID(),
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent ? meta.userAgent.slice(0, 500) : null,
        expiresAt: new Date(Date.now() + refreshDays * 86400_000),
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}

