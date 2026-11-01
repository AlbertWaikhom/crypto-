import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';

@ApiTags('Wallet & Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({
    summary:
      'Retrieve real-time USDT wallet balances, pending totals, earned interest & ledger chart series',
  })
  async getWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.walletService.getOverview(user.id);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'List immutable double-entry ledger history for user' })
  async getLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.walletService.getUserLedger({
      userId: user.id,
      page: Number(page || 1),
      limit: Number(limit || 25),
      type,
    });
  }
}

