import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Injectable,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import {
  nextReadableUid,
  Prisma,
  WithdrawalStatus,
} from '@navrix/database';
import { NotificationEventType } from '@navrix/types';
import { evmAddressSchema } from '@navrix/validation';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { SettingsService } from '../settings/settings.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';

export class CreateWithdrawalDto {
  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' })
  @IsString()
  destinationAddress!: string;

  @ApiPropertyOptional({ example: 'BNB_SMART_CHAIN' })
  @IsOptional()
  @IsString()
  network?: string;
}

@Injectable()
export class WithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly ledgerService: LedgerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createWithdrawal(userId: string, dto: CreateWithdrawalDto) {
    const runtime = await this.settingsService.getRuntimeSettings();
    if (runtime.maintenanceMode || !runtime.withdrawalsEnabled) {
      throw new AppException(
        'WITHDRAWALS_TEMPORARILY_PAUSED',
        'Withdrawal requests are temporarily paused by platform administration.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const network = dto.network || 'BNB_SMART_CHAIN';
    if (network !== 'BNB_SMART_CHAIN') {
      throw new AppException(
        'UNSUPPORTED_NETWORK',
        'Only BNB Smart Chain (BEP-20) is supported for USDT withdrawals.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const addrCheck = evmAddressSchema.safeParse(dto.destinationAddress);
    if (!addrCheck.success) {
      throw new AppException(
        'INVALID_WALLET_ADDRESS',
        addrCheck.error.issues[0]?.message ||
          'Enter a valid BEP-20 destination wallet address.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      dto.amount < runtime.minWithdrawal ||
      dto.amount > runtime.maxWithdrawal
    ) {
      throw new AppException(
        'WITHDRAWAL_AMOUNT_OUT_OF_RANGE',
        `Withdrawal amount must be between ${runtime.minWithdrawal} USDT and ${runtime.maxWithdrawal} USDT.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const amountDecimal = new Prisma.Decimal(dto.amount.toFixed(8));

    return this.prisma.$transaction(async (tx) => {
      // Lock wallet row and move available -> locked atomically
      await this.ledgerService.lockFundsForWithdrawal(tx, {
        userId,
        amount: amountDecimal,
      });

      const withdrawalUid = await nextReadableUid(tx, 'WDR', true);
      const created = await tx.withdrawal.create({
        data: {
          withdrawalUid,
          userId,
          amount: amountDecimal,
          feeAmount: new Prisma.Decimal(0),
          netAmount: amountDecimal,
          asset: 'USDT',
          network: 'BNB_SMART_CHAIN',
          destinationAddress: addrCheck.data,
          status: WithdrawalStatus.PENDING_REVIEW,
        },
      });

      await this.notificationsService.notifyUser(
        {
          userId,
          eventType: NotificationEventType.WITHDRAWAL_REQUESTED,
          title: 'Withdrawal Request Submitted',
          message: `Your withdrawal request ${withdrawalUid} for ${amountDecimal.toFixed(
            2,
          )} USDT has been locked for admin review.`,
          metadata: { withdrawalUid },
        },
        tx,
      );

      return created;
    });
  }

  async listUserWithdrawals(userId: string) {
    return this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserWithdrawal(userId: string, uidOrId: string) {
    const w = await this.prisma.withdrawal.findFirst({
      where: {
        userId,
        OR: [{ withdrawalUid: uidOrId }, { id: uidOrId }],
      },
    });

    if (!w) {
      throw new AppException(
        'WITHDRAWAL_NOT_FOUND',
        'Withdrawal request was not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    return w;
  }
}

@ApiTags('Withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Request a BEP-20 USDT withdrawal and atomically lock available balance',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.withdrawalsService.createWithdrawal(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List withdrawal requests for authenticated user' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.withdrawalsService.listUserWithdrawals(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get withdrawal request details' })
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.withdrawalsService.getUserWithdrawal(user.id, id);
  }
}

@Module({
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}

