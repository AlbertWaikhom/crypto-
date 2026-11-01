import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { Request } from 'express';
import {
  InterestCalculationModel,
  UserRole as PrismaUserRole,
} from '@navrix/database';
import { UserRole } from '@navrix/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { DepositsModule } from '../deposits/deposits.module';
import { AdminService } from './admin.service';

export class RejectReasonDto {
  @ApiProperty({ example: 'On-chain transfer recipient did not match platform vault.' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

export class CreateInterestDto {
  @ApiProperty({ enum: InterestCalculationModel })
  @IsEnum(InterestCalculationModel)
  calculationModel!: InterestCalculationModel;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  rateOrAmount!: number;

  @ApiProperty({ example: '2026-11-CYCLE-2' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  periodKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class CompleteWithdrawalDto {
  @ApiProperty({
    example:
      '0x8888888888888888888888888888888888888888888888888888888888888801',
  })
  @IsString()
  transactionHash!: string;
}

export class UpdateSettingDto {
  @ApiProperty({ example: 'MIN_DEPOSIT' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  key!: string;

  @ApiProperty({ example: '25' })
  @IsString()
  @MaxLength(2000)
  value!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CircuitBreakerDto {
  @ApiProperty({
    enum: ['DEPOSITS_ENABLED', 'WITHDRAWALS_ENABLED', 'MAINTENANCE_MODE'],
  })
  @IsString()
  key!: 'DEPOSITS_ENABLED' | 'WITHDRAWALS_ENABLED' | 'MAINTENANCE_MODE';

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}

export class UpsertPlanDto {
  @ApiProperty({ example: 'NAVRIX-CORE-30D' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Core Yield Vault (30 Days)' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: InterestCalculationModel })
  @IsEnum(InterestCalculationModel)
  interestModel!: InterestCalculationModel;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  interestRate!: number;

  @ApiProperty({ example: 'MONTHLY' })
  @IsString()
  calculationFrequency!: string;

  @ApiProperty({ example: 30 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  durationDays!: number;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  minAmount!: number;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  maxAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('Admin & Master Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

  private buildMeta(user: AuthenticatedUser, req: Request) {
    const rawId = (req as unknown as { id?: unknown }).id;
    return {
      adminId: user.id,
      adminRole: user.role,
      ipAddress:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip,
      userAgent: req.headers['user-agent'],
      requestId: rawId ? String(rawId) : undefined,
    };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard real-time operational statistics' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('master/overview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
  @ApiOperation({
    summary:
      'Master Admin Command Center: Solvency reconciliation, live vault telemetry & circuit breakers',
  })
  async getMasterOverview() {
    return this.adminService.getMasterAdminOverview();
  }

  @Post('master/circuit-breaker')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Toggle Master Admin platform emergency circuit breakers' })
  async toggleCircuitBreaker(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CircuitBreakerDto,
    @Req() req: Request,
  ) {
    return this.adminService.toggleCircuitBreaker(dto, this.buildMeta(user, req));
  }

  @Get('users')
  @ApiOperation({ summary: 'List all platform users and wallet summaries' })
  async getUsers() {
    return this.adminService.listUsers(false);
  }

  @Get('admin-users')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'List all administrative staff accounts' })
  async getAdminUsers() {
    return this.adminService.listUsers(true);
  }

  @Patch('users/:uid/status')
  @ApiOperation({ summary: 'Suspend or activate a user account' })
  async updateUserStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('uid') uid: string,
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED' },
    @Req() req: Request,
  ) {
    return this.adminService.updateUserStatus(
      uid,
      body.status,
      this.buildMeta(user, req),
    );
  }

  @Patch('users/:uid/role')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Master Admin only: Update user/staff role assignment' })
  async updateUserRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('uid') uid: string,
    @Body() body: { role: PrismaUserRole },
    @Req() req: Request,
  ) {
    return this.adminService.updateUserRole(
      uid,
      body.role,
      this.buildMeta(user, req),
    );
  }

  @Get('deposits')
  @ApiOperation({ summary: 'List all deposits across users for admin queue' })
  async getDeposits(@Query('status') status?: string) {
    return this.adminService.listDeposits(status);
  }

  @Get('deposits/:id')
  @ApiOperation({
    summary:
      'Get full deposit verification detail (requested vs on-chain amount, hashes, confirmations)',
  })
  async getDeposit(@Param('id') id: string) {
    return this.adminService.getDepositDetail(id);
  }

  @Post('deposits/:id/verify')
  @ApiOperation({ summary: 'Run live server-side BEP-20 blockchain verification' })
  async verifyDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.adminService.verifyDeposit(id, this.buildMeta(user, req));
  }

  @Post('deposits/:id/approve')
  @ApiOperation({
    summary:
      'Re-verify on-chain tx, approve deposit, post immutable DEPOSIT ledger entry & activate Investment',
  })
  async approveDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.adminService.approveDeposit(id, this.buildMeta(user, req));
  }

  @Post('deposits/:id/reject')
  @ApiOperation({ summary: 'Reject deposit request with audit trail & notification' })
  async rejectDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectReasonDto,
    @Req() req: Request,
  ) {
    return this.adminService.rejectDeposit(
      id,
      dto.reason,
      this.buildMeta(user, req),
    );
  }

  @Get('investments')
  @ApiOperation({ summary: 'List all customer investment records' })
  async getInvestments() {
    return this.adminService.listInvestments();
  }

  @Post('investment-plans')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create or update a configurable investment interest plan' })
  async upsertPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertPlanDto,
    @Req() req: Request,
  ) {
    return this.adminService.upsertInvestmentPlan(dto, this.buildMeta(user, req));
  }

  @Post('investments/:id/interest')
  @ApiOperation({
    summary:
      'Calculate and credit interest for a specific period (creates distinct INTEREST ledger entry)',
  })
  async creditInterest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateInterestDto,
    @Req() req: Request,
  ) {
    return this.adminService.creditInvestmentInterest(
      id,
      dto,
      this.buildMeta(user, req),
    );
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'List all withdrawal requests' })
  async getWithdrawals(@Query('status') status?: string) {
    return this.adminService.listWithdrawals(status);
  }

  @Post('withdrawals/:id/approve')
  @ApiOperation({ summary: 'Approve pending withdrawal for outbound settlement' })
  async approveWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.adminService.approveWithdrawal(id, this.buildMeta(user, req));
  }

  @Post('withdrawals/:id/reject')
  @ApiOperation({
    summary: 'Reject withdrawal and atomically unlock funds back to available balance',
  })
  async rejectWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectReasonDto,
    @Req() req: Request,
  ) {
    return this.adminService.rejectWithdrawal(
      id,
      dto.reason,
      this.buildMeta(user, req),
    );
  }

  @Post('withdrawals/:id/complete')
  @ApiOperation({
    summary:
      'Record outbound BSC tx hash and create final immutable WITHDRAWAL ledger debit',
  })
  async completeWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteWithdrawalDto,
    @Req() req: Request,
  ) {
    return this.adminService.completeWithdrawal(
      id,
      dto.transactionHash,
      this.buildMeta(user, req),
    );
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Explore full platform immutable double-entry ledger' })
  async getLedger(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listAllLedger(
      Number(page || 1),
      Number(limit || 40),
    );
  }

  @Get('blockchain-transactions')
  @ApiOperation({ summary: 'List verified inbound & outbound blockchain transactions' })
  async getBlockchainTxs() {
    return this.adminService.listBlockchainTransactions();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'List immutable administrative audit trail records' })
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.listLogs({
      page: Number(page || 1),
      limit: Number(limit || 40),
      action,
    });
  }

  @Get('settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'List configurable system settings' })
  async getSettings() {
    return this.adminService.listSettings();
  }

  @Put('settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update a system setting with immutable audit trail' })
  async updateSetting(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingDto,
    @Req() req: Request,
  ) {
    return this.adminService.updateSetting(dto, this.buildMeta(user, req));
  }
}

@Module({
  imports: [DepositsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
