import { Controller, Get, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import * as crypto from 'crypto';
import { CommonModule } from './common/common.module';
import { PrismaService } from './common/prisma.service';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response.interceptor';
import { SettingsModule } from './settings/settings.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './storage/storage.module';
import { BlockchainApiModule } from './blockchain/blockchain.module';
import { LedgerModule } from './ledger/ledger.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { DepositsModule } from './deposits/deposits.module';
import { InvestmentsModule } from './investments/investments.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { AdminModule } from './admin/admin.module';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRawUnsafe('SELECT 1');
    return {
      status: 'ok',
      service: 'navrix-backend',
      databaseEngine: 'mysql',
      databaseMode: 'MYSQL_CONNECTED',
      databaseTarget: this.prisma.maskedDatabaseTarget,
      blockchainMode: process.env.BLOCKCHAIN_MODE || 'MOCK',
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) || crypto.randomUUID(),
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.currentPassword',
            'req.body.newPassword',
            'req.body.idToken',
            'req.body.refreshToken',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
        customProps: (req) => ({
          userId: (req as unknown as { user?: { publicUid?: string } }).user
            ?.publicUid,
        }),
        level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    CommonModule,
    SettingsModule,
    AuditModule,
    NotificationsModule,
    StorageModule,
    BlockchainApiModule,
    LedgerModule,
    AuthModule,
    UsersModule,
    WalletModule,
    DepositsModule,
    InvestmentsModule,
    WithdrawalsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
  ],
})
export class AppModule {}

