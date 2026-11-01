import { HttpStatus, Injectable } from '@nestjs/common';
import {
  DepositStatus,
  InterestCalculationModel,
  InvestmentStatus,
  LedgerTransactionType,
  nextReadableUid,
  Prisma,
  UserRole as PrismaUserRole,
  UserStatus as PrismaUserStatus,
  WithdrawalStatus,
} from '@navrix/database';
import {
  AuditAction,
  canTransitionWithdrawalStatus,
  NotificationEventType,
  WithdrawalStatus as DomainWithdrawalStatus,
} from '@navrix/types';
import { bscTxHashSchema } from '@navrix/validation';
import { PrismaService } from '../common/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { BlockchainApiService } from '../blockchain/blockchain.module';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { DepositStateService } from '../deposits/deposit-state.service';

export interface AdminRequestMeta {
  adminId: string;
  adminRole: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainApiService,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
    private readonly depositStateService: DepositStateService,
  ) {}

  async getDashboardStats() {
    const [
      totalUsers,
      pendingDeposits,
      approvedDeposits,
      pendingWithdrawals,
      overdueReviews,
      depositLedgerAgg,
      withdrawalLedgerAgg,
      interestLedgerAgg,
      recentDeposits,
      recentWithdrawals,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: PrismaUserRole.USER } }),
      this.prisma.deposit.count({
        where: {
          status: {
            in: [
              DepositStatus.PAYMENT_SUBMITTED,
              DepositStatus.BLOCKCHAIN_DETECTED,
              DepositStatus.UNDER_REVIEW,
            ],
          },
        },
      }),
      this.prisma.deposit.count({ where: { status: DepositStatus.APPROVED } }),
      this.prisma.withdrawal.count({
        where: {
          status: {
            in: [
              WithdrawalStatus.PENDING_REVIEW,
              WithdrawalStatus.APPROVED,
              WithdrawalStatus.PROCESSING,
            ],
          },
        },
      }),
      this.prisma.deposit.count({
        where: {
          status: {
            in: [
              DepositStatus.PAYMENT_SUBMITTED,
              DepositStatus.BLOCKCHAIN_DETECTED,
              DepositStatus.UNDER_REVIEW,
            ],
          },
          reviewDeadline: { lt: new Date() },
        },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { transactionType: LedgerTransactionType.DEPOSIT },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { transactionType: LedgerTransactionType.WITHDRAWAL },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { transactionType: LedgerTransactionType.INTEREST },
        _sum: { amount: true },
      }),
      this.prisma.deposit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { publicUid: true, name: true, email: true } },
          submission: true,
          blockchainTx: true,
        },
      }),
      this.prisma.withdrawal.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { publicUid: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      totalUsers,
      pendingDeposits,
      approvedDeposits,
      pendingWithdrawals,
      overdueReviews,
      totalDeposited: (
        depositLedgerAgg._sum.amount ?? new Prisma.Decimal(0)
      ).toFixed(2),
      totalWithdrawn: (
        withdrawalLedgerAgg._sum.amount ?? new Prisma.Decimal(0)
      ).toFixed(2),
      totalInterestCredited: (
        interestLedgerAgg._sum.amount ?? new Prisma.Decimal(0)
      ).toFixed(2),
      recentDeposits,
      recentWithdrawals,
    };
  }

  /**
   * Master Admin Omniscient Platform Monitor:
   * Combines ledger solvency audit, live vault telemetry, circuit breakers,
   * staff hierarchy metrics, and live security audit feed.
   */
  async getMasterAdminOverview() {
    const [reconciliation, vaultTelemetry, runtime, adminCounts, activeSessions, recentAudits] =
      await Promise.all([
        this.ledgerService.reconcilePlatformLedger(),
        this.blockchainService.getVaultTelemetry(),
        this.settingsService.getRuntimeSettings(),
        this.prisma.user.groupBy({
          by: ['role'],
          _count: { _all: true },
        }),
        this.prisma.userSession.count({
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
        }),
        this.auditService.listLogs({ page: 1, limit: 15 }),
      ]);

    return {
      reconciliation,
      vaultTelemetry,
      runtime,
      roleBreakdown: adminCounts,
      activeSessions,
      recentAudits: recentAudits.items,
    };
  }

  async toggleCircuitBreaker(
    params: {
      key: 'DEPOSITS_ENABLED' | 'WITHDRAWALS_ENABLED' | 'MAINTENANCE_MODE';
      enabled: boolean;
    },
    meta: AdminRequestMeta,
  ) {
    const valueStr = params.enabled ? 'true' : 'false';
    const { oldValue, updated } = await this.settingsService.upsertSetting({
      key: params.key,
      value: valueStr,
      category: 'CIRCUIT_BREAKER',
      isPublic: true,
      updatedById: meta.adminId,
    });

    await this.auditService.record({
      adminId: meta.adminId,
      actorRole: meta.adminRole,
      action: AuditAction.EMERGENCY_PAUSE_TOGGLED,
      targetType: 'SYSTEM_SETTING',
      targetId: params.key,
      oldValue: { value: oldValue },
      newValue: { value: valueStr },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return updated;
  }

  async listUsers(onlyAdmins = false) {
    return this.prisma.user.findMany({
      where: onlyAdmins
        ? {
            role: {
              in: [
                PrismaUserRole.ADMIN,
                PrismaUserRole.SUPER_ADMIN,
                PrismaUserRole.MASTER_ADMIN,
              ],
            },
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        publicUid: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        wallets: {
          select: {
            asset: true,
            availableBalance: true,
            lockedBalance: true,
            investedBalance: true,
          },
        },
      },
    });
  }

  async updateUserStatus(
    targetUid: string,
    status: 'ACTIVE' | 'SUSPENDED',
    meta: AdminRequestMeta,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { publicUid: targetUid },
    });
    if (!target) {
      throw new AppException(
        'USER_NOT_FOUND',
        'Target user was not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      target.role === PrismaUserRole.MASTER_ADMIN &&
      meta.adminRole !== PrismaUserRole.MASTER_ADMIN
    ) {
      throw new AppException(
        'CANNOT_MODIFY_MASTER_ADMIN',
        'Only a Master Admin can modify a Master Admin account.',
        HttpStatus.FORBIDDEN,
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: { status: status as PrismaUserStatus },
    });

    if (status === 'SUSPENDED') {
      await this.prisma.userSession.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.auditService.record({
      adminId: meta.adminId,
      actorRole: meta.adminRole,
      action:
        status === 'SUSPENDED'
          ? AuditAction.USER_SUSPENDED
          : AuditAction.USER_ACTIVATED,
      targetType: 'USER',
      targetId: target.publicUid,
      oldValue: { status: target.status },
      newValue: { status: updated.status },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { uid: updated.publicUid, status: updated.status };
  }

  async updateUserRole(
    targetUid: string,
    newRole: PrismaUserRole,
    meta: AdminRequestMeta,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { publicUid: targetUid },
    });
    if (!target) {
      throw new AppException(
        'USER_NOT_FOUND',
        'Target user was not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: { role: newRole },
    });

    await this.auditService.record({
      adminId: meta.adminId,
      actorRole: meta.adminRole,
      action: AuditAction.USER_ROLE_CHANGED,
      targetType: 'USER',
      targetId: target.publicUid,
      oldValue: { role: target.role },
      newValue: { role: updated.role },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { uid: updated.publicUid, role: updated.role };
  }

  async listDeposits(status?: string) {
    return this.prisma.deposit.findMany({
      where: status ? { status: status as DepositStatus } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { publicUid: true, name: true, email: true },
        },
        submission: true,
        blockchainTx: true,
        investment: true,
      },
    });
  }

  async getDepositDetail(uidOrId: string) {
    const dep = await this.prisma.deposit.findFirst({
      where: { OR: [{ depositUid: uidOrId }, { id: uidOrId }] },
      include: {
        user: {
          select: { publicUid: true, name: true, email: true, phone: true },
        },
        reviewedBy: {
          select: { publicUid: true, name: true, email: true },
        },
        submission: true,
        blockchainTx: true,
        investment: true,
      },
    });

    if (!dep) {
      throw new AppException(
        'DEPOSIT_NOT_FOUND',
        'Deposit record was not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    return dep;
  }

  async verifyDeposit(uidOrId: string, meta: AdminRequestMeta) {
    const dep = await this.getDepositDetail(uidOrId);
    if (!dep.submission?.transactionHash) {
      throw new AppException(
        'NO_TRANSACTION_HASH_SUBMITTED',
        'User has not submitted a blockchain transaction hash for this deposit.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const verification = await this.blockchainService.verifyDepositOnChain({
      depositId: dep.id,
      transactionHash: dep.submission.transactionHash,
      expectedAmount: dep.requestedAmount.toString(),
      expectedReceivingAddress: dep.receivingAddress,
    });

    const savedTx = await this.prisma.blockchainTransaction.upsert({
      where: { transactionHash: dep.submission.transactionHash },
      update: {
        verificationMode: verification.mode,
        chainId: verification.chainId,
        blockNumber: verification.blockNumber,
        blockTimestamp: verification.blockTimestamp,
        fromAddress: verification.fromAddress,
        toAddress: verification.toAddress,
        tokenContract: verification.tokenContract,
        tokenAmount: verification.tokenAmount
          ? new Prisma.Decimal(verification.tokenAmount)
          : null,
        confirmationCount: verification.confirmationCount,
        txSucceeded: verification.txSucceeded,
        isValid: verification.isValid,
        failureCode: verification.failureCode || null,
        failureReason: verification.failureReason || null,
        verifiedAt: new Date(),
      },
      create: {
        transactionHash: dep.submission.transactionHash,
        depositId: dep.id,
        direction: 'INBOUND',
        verificationMode: verification.mode,
        network: 'BNB_SMART_CHAIN',
        chainId: verification.chainId,
        blockNumber: verification.blockNumber,
        blockTimestamp: verification.blockTimestamp,
        fromAddress: verification.fromAddress,
        toAddress: verification.toAddress,
        tokenContract: verification.tokenContract,
        tokenAmount: verification.tokenAmount
          ? new Prisma.Decimal(verification.tokenAmount)
          : null,
        confirmationCount: verification.confirmationCount,
        txSucceeded: verification.txSucceeded,
        isValid: verification.isValid,
        failureCode: verification.failureCode || null,
        failureReason: verification.failureReason || null,
      },
    });

    await this.auditService.record({
      adminId: meta.adminId,
      actorRole: meta.adminRole,
      action: AuditAction.DEPOSIT_VERIFIED,
      targetType: 'DEPOSIT',
      targetId: dep.depositUid,
      newValue: {
        isValid: verification.isValid,
        mode: verification.mode,
        confirmations: verification.confirmationCount,
        failureCode: verification.failureCode || null,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { verification, blockchainTx: savedTx };
  }

  /**
   * Section 20 & 31: Mandatory Re-Verification before Deposit Approval.
   * Credits immutable ledger ONLY using the authoritative blockchain token amount
   * and activates an Investment record in a single MySQL transaction with row locks.
   */
  async approveDeposit(uidOrId: string, meta: AdminRequestMeta) {
    const dep = await this.getDepositDetail(uidOrId);

    if (dep.userId === meta.adminId) {
      throw new AppException(
        'SELF_APPROVAL_FORBIDDEN',
        'Administrators are strictly prohibited from approving their own deposits.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (dep.status === DepositStatus.APPROVED) {
      throw new AppException(
        'DEPOSIT_ALREADY_PROCESSED',
        'This deposit has already been processed.',
        HttpStatus.CONFLICT,
      );
    }

    this.depositStateService.assertTransition(dep.status, DepositStatus.APPROVED);

    if (!dep.submission?.transactionHash) {
      throw new AppException(
        'MISSING_TRANSACTION_HASH',
        'Cannot approve a deposit without a verified blockchain transaction hash.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Re-run blockchain verification server-side right before approval!
    const { verification } = await this.verifyDeposit(dep.depositUid, meta);
    if (!verification.isValid || !verification.tokenAmount) {
      throw new AppException(
        'BLOCKCHAIN_VERIFICATION_FAILED',
        verification.failureReason ||
          'Blockchain verification failed. Deposit cannot be approved.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const authoritativeAmount = new Prisma.Decimal(verification.tokenAmount);

    // Resolve active investment plan (selected plan or default active plan)
    const plan = dep.planCode
      ? await this.prisma.investmentPlan.findUnique({
          where: { code: dep.planCode },
        })
      : await this.prisma.investmentPlan.findFirst({
          where: { isActive: true },
          orderBy: { minAmount: 'asc' },
        });

    const durationDays = plan?.durationDays ?? 30;
    const interestModel =
      plan?.interestModel ?? InterestCalculationModel.PERCENTAGE;
    const interestRate = plan?.interestRate ?? new Prisma.Decimal('5.0000');

    return this.prisma.$transaction(async (tx) => {
      // Lock deposit row to prevent race-condition double approvals
      if (typeof (tx as { $queryRaw?: unknown }).$queryRaw === 'function') {
        await tx.$queryRaw`SELECT id FROM deposits WHERE id = ${dep.id} FOR UPDATE`;
      }

      const freshDep = await tx.deposit.findUniqueOrThrow({
        where: { id: dep.id },
      });
      if (freshDep.status === DepositStatus.APPROVED) {
        throw new AppException(
          'DEPOSIT_ALREADY_PROCESSED',
          'This deposit has already been processed.',
          HttpStatus.CONFLICT,
        );
      }

      this.depositStateService.assertTransition(
        freshDep.status,
        DepositStatus.APPROVED,
      );

      const now = new Date();
      const updatedDeposit = await tx.deposit.update({
        where: { id: dep.id },
        data: {
          status: DepositStatus.APPROVED,
          verifiedAmount: authoritativeAmount,
          reviewedAt: now,
          reviewedById: meta.adminId,
        },
      });

      const ledgerEntry = await this.ledgerService.recordApprovedDeposit(tx, {
        userId: dep.userId,
        amount: authoritativeAmount,
        depositUid: dep.depositUid,
        idempotencyKey: `deposit:approve:${dep.id}`,
        allocateToInvestment: true,
        adminId: meta.adminId,
        description: `Approved BEP-20 USDT deposit ${dep.depositUid} (Tx ${verification.transactionHash.slice(
          0,
          12,
        )}...)`,
      });

      const investmentUid = await nextReadableUid(tx, 'INV', true);
      const maturityDate = new Date(now.getTime() + durationDays * 86400_000);
      const investment = await tx.investment.create({
        data: {
          investmentUid,
          userId: dep.userId,
          depositId: dep.id,
          planId: plan?.id || null,
          principalAmount: authoritativeAmount,
          asset: 'USDT',
          startDate: now,
          maturityDate,
          interestModel,
          interestRate,
          interestAmount: new Prisma.Decimal(0),
          status: InvestmentStatus.ACTIVE,
        },
      });

      await this.auditService.record(
        {
          adminId: meta.adminId,
          actorRole: meta.adminRole,
          action: AuditAction.DEPOSIT_APPROVED,
          targetType: 'DEPOSIT',
          targetId: dep.depositUid,
          oldValue: { status: freshDep.status },
          newValue: {
            status: DepositStatus.APPROVED,
            verifiedAmount: authoritativeAmount.toFixed(2),
            ledgerUid: ledgerEntry.ledgerUid,
            investmentUid: investment.investmentUid,
          },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      await this.notificationsService.notifyUser(
        {
          userId: dep.userId,
          eventType: NotificationEventType.DEPOSIT_APPROVED,
          title: 'Deposit Approved & Credited',
          message: `Your deposit ${dep.depositUid} (${authoritativeAmount.toFixed(
            2,
          )} USDT) has been verified on BNB Smart Chain and credited.`,
          metadata: {
            depositUid: dep.depositUid,
            ledgerUid: ledgerEntry.ledgerUid,
          },
        },
        tx,
      );

      await this.notificationsService.notifyUser(
        {
          userId: dep.userId,
          eventType: NotificationEventType.INVESTMENT_ACTIVATED,
          title: 'Investment Position Activated',
          message: `Investment ${investment.investmentUid} is now active with ${authoritativeAmount.toFixed(
            2,
          )} USDT principal.`,
          metadata: { investmentUid: investment.investmentUid },
        },
        tx,
      );

      return {
        deposit: updatedDeposit,
        ledgerEntry,
        investment,
      };
    });
  }

  async rejectDeposit(uidOrId: string, reason: string, meta: AdminRequestMeta) {
    const dep = await this.getDepositDetail(uidOrId);
    if (
      dep.status === DepositStatus.APPROVED ||
      dep.status === DepositStatus.REJECTED
    ) {
      throw new AppException(
        'DEPOSIT_ALREADY_PROCESSED',
        'This deposit has already been finalized.',
        HttpStatus.CONFLICT,
      );
    }

    this.depositStateService.assertTransition(dep.status, DepositStatus.REJECTED);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.deposit.update({
        where: { id: dep.id },
        data: {
          status: DepositStatus.REJECTED,
          rejectionReason: reason.trim(),
          reviewedAt: new Date(),
          reviewedById: meta.adminId,
        },
      });

      await this.auditService.record(
        {
          adminId: meta.adminId,
          actorRole: meta.adminRole,
          action: AuditAction.DEPOSIT_REJECTED,
          targetType: 'DEPOSIT',
          targetId: dep.depositUid,
          oldValue: { status: dep.status },
          newValue: { status: DepositStatus.REJECTED, reason: reason.trim() },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      await this.notificationsService.notifyUser(
        {
          userId: dep.userId,
          eventType: NotificationEventType.DEPOSIT_REJECTED,
          title: 'Deposit Rejected',
          message: `Deposit ${dep.depositUid} was not approved. Reason: ${reason.trim()}`,
          metadata: { depositUid: dep.depositUid },
        },
        tx,
      );

      return updated;
    });
  }

  async listInvestments() {
    return this.prisma.investment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { publicUid: true, name: true, email: true } },
        plan: true,
        interestRecords: { orderBy: { creditedAt: 'desc' } },
      },
    });
  }

  async upsertInvestmentPlan(
    dto: {
      code: string;
      name: string;
      description?: string;
      interestModel: InterestCalculationModel;
      interestRate: number;
      calculationFrequency: string;
      durationDays: number;
      minAmount: number;
      maxAmount: number;
      isActive?: boolean;
    },
    meta: AdminRequestMeta,
  ) {
    const plan = await this.prisma.investmentPlan.upsert({
      where: { code: dto.code.trim().toUpperCase() },
      update: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        interestModel: dto.interestModel,
        interestRate: new Prisma.Decimal(dto.interestRate.toFixed(4)),
        calculationFrequency: dto.calculationFrequency,
        durationDays: dto.durationDays,
        minAmount: new Prisma.Decimal(dto.minAmount.toFixed(8)),
        maxAmount: new Prisma.Decimal(dto.maxAmount.toFixed(8)),
        isActive: dto.isActive ?? true,
      },
      create: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        interestModel: dto.interestModel,
        interestRate: new Prisma.Decimal(dto.interestRate.toFixed(4)),
        calculationFrequency: dto.calculationFrequency,
        durationDays: dto.durationDays,
        minAmount: new Prisma.Decimal(dto.minAmount.toFixed(8)),
        maxAmount: new Prisma.Decimal(dto.maxAmount.toFixed(8)),
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.record({
      adminId: meta.adminId,
      actorRole: meta.adminRole,
      action: AuditAction.INVESTMENT_PLAN_UPDATED,
      targetType: 'INVESTMENT_PLAN',
      targetId: plan.code,
      newValue: {
        interestModel: plan.interestModel,
        interestRate: plan.interestRate.toString(),
        durationDays: plan.durationDays,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return plan;
  }

  /**
   * Section 17: Admin-controlled Interest Calculation & Separate Ledger Credit.
   * Supports FIXED_AMOUNT, PERCENTAGE, DAILY, WEEKLY, MONTHLY, MATURITY.
   * Strictly prevents crediting the same (investmentId, periodKey) twice.
   */
  async creditInvestmentInterest(
    investmentUidOrId: string,
    dto: {
      calculationModel: InterestCalculationModel;
      rateOrAmount: number;
      periodKey: string;
      description?: string;
    },
    meta: AdminRequestMeta,
  ) {
    const inv = await this.prisma.investment.findFirst({
      where: {
        OR: [
          { investmentUid: investmentUidOrId },
          { id: investmentUidOrId },
        ],
      },
    });

    if (!inv) {
      throw new AppException(
        'INVESTMENT_NOT_FOUND',
        'Investment record was not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (inv.status !== InvestmentStatus.ACTIVE) {
      throw new AppException(
        'INVESTMENT_NOT_ACTIVE',
        'Interest can only be credited to ACTIVE investment records.',
        HttpStatus.CONFLICT,
      );
    }

    const periodKey = dto.periodKey.trim().toUpperCase();
    const existingPeriod = await this.prisma.interestRecord.findUnique({
      where: {
        investmentId_periodKey: {
          investmentId: inv.id,
          periodKey,
        },
      },
    });

    if (existingPeriod) {
      throw new AppException(
        'DUPLICATE_INTEREST_PERIOD',
        `Interest for period "${periodKey}" has already been credited to ${inv.investmentUid}.`,
        HttpStatus.CONFLICT,
      );
    }

    const rateOrAmountDec = new Prisma.Decimal(dto.rateOrAmount.toFixed(8));
    let calculatedInterest: Prisma.Decimal;

    switch (dto.calculationModel) {
      case InterestCalculationModel.FIXED_AMOUNT:
        calculatedInterest = rateOrAmountDec;
        break;
      case InterestCalculationModel.DAILY:
        // Daily rate % applied to principal
        calculatedInterest = inv.principalAmount.mul(rateOrAmountDec).div(100);
        break;
      case InterestCalculationModel.WEEKLY:
      case InterestCalculationModel.MONTHLY:
      case InterestCalculationModel.MATURITY:
      case InterestCalculationModel.PERCENTAGE:
      default:
        calculatedInterest = inv.principalAmount.mul(rateOrAmountDec).div(100);
        break;
    }

    // Round down to 8 decimal places
    calculatedInterest = new Prisma.Decimal(calculatedInterest.toFixed(8));
    if (calculatedInterest.lte(0)) {
      throw new AppException(
        'INVALID_INTEREST_RESULT',
        'Calculated interest must be strictly positive.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const ledgerEntry = await this.ledgerService.recordInterestCredit(tx, {
        userId: inv.userId,
        amount: calculatedInterest,
        investmentUid: inv.investmentUid,
        idempotencyKey: `interest:${inv.id}:${periodKey}`,
        adminId: meta.adminId,
        description:
          dto.description?.trim() ||
          `Interest credit (${periodKey}) for ${inv.investmentUid}`,
      });

      const interestUid = await nextReadableUid(tx, 'INT', true);
      const interestRecord = await tx.interestRecord.create({
        data: {
          interestUid,
          investmentId: inv.id,
          userId: inv.userId,
          periodKey,
          calculationModel: dto.calculationModel,
          rateApplied: new Prisma.Decimal(dto.rateOrAmount.toFixed(4)),
          principalSnapshot: inv.principalAmount,
          amount: calculatedInterest,
          ledgerEntryId: ledgerEntry.id,
          status: 'CREDITED',
          description: dto.description?.trim() || null,
          createdById: meta.adminId,
        },
      });

      await tx.investment.update({
        where: { id: inv.id },
        data: {
          interestAmount: inv.interestAmount.plus(calculatedInterest),
        },
      });

      await this.auditService.record(
        {
          adminId: meta.adminId,
          actorRole: meta.adminRole,
          action: AuditAction.INTEREST_CREATED,
          targetType: 'INVESTMENT',
          targetId: inv.investmentUid,
          newValue: {
            interestUid,
            periodKey,
            calculationModel: dto.calculationModel,
            amount: calculatedInterest.toFixed(2),
            ledgerUid: ledgerEntry.ledgerUid,
          },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      await this.notificationsService.notifyUser(
        {
          userId: inv.userId,
          eventType: NotificationEventType.INTEREST_CREDITED,
          title: 'Yield / Interest Credited',
          message: `+${calculatedInterest.toFixed(
            2,
          )} USDT interest credited to your available balance for ${
            inv.investmentUid
          } (${periodKey}).`,
          metadata: {
            investmentUid: inv.investmentUid,
            interestUid,
            periodKey,
          },
        },
        tx,
      );

      return { interestRecord, ledgerEntry };
    });
  }

  async listWithdrawals(status?: string) {
    return this.prisma.withdrawal.findMany({
      where: status ? { status: status as WithdrawalStatus } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { publicUid: true, name: true, email: true } },
        admin: { select: { publicUid: true, name: true } },
      },
    });
  }

  async approveWithdrawal(uidOrId: string, meta: AdminRequestMeta) {
    const w = await this.prisma.withdrawal.findFirst({
      where: { OR: [{ withdrawalUid: uidOrId }, { id: uidOrId }] },
    });
    if (!w) {
      throw new AppException(
        'WITHDRAWAL_NOT_FOUND',
        'Withdrawal request was not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      !canTransitionWithdrawalStatus(
        w.status as unknown as DomainWithdrawalStatus,
        DomainWithdrawalStatus.APPROVED,
      )
    ) {
      throw new AppException(
        'INVALID_WITHDRAWAL_TRANSITION',
        `Cannot approve withdrawal from status ${w.status}.`,
        HttpStatus.CONFLICT,
      );
    }

    const updated = await this.prisma.withdrawal.update({
      where: { id: w.id },
      data: {
        status: WithdrawalStatus.APPROVED,
        adminId: meta.adminId,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.record({
      adminId: meta.adminId,
      actorRole: meta.adminRole,
      action: AuditAction.WITHDRAWAL_APPROVED,
      targetType: 'WITHDRAWAL',
      targetId: w.withdrawalUid,
      oldValue: { status: w.status },
      newValue: { status: WithdrawalStatus.APPROVED },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    await this.notificationsService.notifyUser({
      userId: w.userId,
      eventType: NotificationEventType.WITHDRAWAL_APPROVED,
      title: 'Withdrawal Approved for Payout',
      message: `Your withdrawal ${w.withdrawalUid} (${w.amount.toFixed(
        2,
      )} USDT) has been approved and queued for on-chain settlement.`,
      metadata: { withdrawalUid: w.withdrawalUid },
    });

    return updated;
  }

  async rejectWithdrawal(
    uidOrId: string,
    reason: string,
    meta: AdminRequestMeta,
  ) {
    const w = await this.prisma.withdrawal.findFirst({
      where: { OR: [{ withdrawalUid: uidOrId }, { id: uidOrId }] },
    });
    if (!w) {
      throw new AppException(
        'WITHDRAWAL_NOT_FOUND',
        'Withdrawal request was not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      !canTransitionWithdrawalStatus(
        w.status as unknown as DomainWithdrawalStatus,
        DomainWithdrawalStatus.REJECTED,
      )
    ) {
      throw new AppException(
        'INVALID_WITHDRAWAL_TRANSITION',
        `Cannot reject withdrawal in status ${w.status}.`,
        HttpStatus.CONFLICT,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (typeof (tx as { $queryRaw?: unknown }).$queryRaw === 'function') {
        await tx.$queryRaw`SELECT id FROM withdrawals WHERE id = ${w.id} FOR UPDATE`;
      }
      const fresh = await tx.withdrawal.findUniqueOrThrow({
        where: { id: w.id },
      });
      if (
        fresh.status === WithdrawalStatus.REJECTED ||
        fresh.status === WithdrawalStatus.COMPLETED
      ) {
        throw new AppException(
          'WITHDRAWAL_ALREADY_FINALIZED',
          'This withdrawal has already been finalized.',
          HttpStatus.CONFLICT,
        );
      }

      // Unlock funds back to user's availableBalance
      await this.ledgerService.unlockRejectedWithdrawal(tx, {
        userId: w.userId,
        amount: w.amount,
      });

      const updated = await tx.withdrawal.update({
        where: { id: w.id },
        data: {
          status: WithdrawalStatus.REJECTED,
          rejectionReason: reason.trim(),
          adminId: meta.adminId,
          reviewedAt: new Date(),
        },
      });

      await this.auditService.record(
        {
          adminId: meta.adminId,
          actorRole: meta.adminRole,
          action: AuditAction.WITHDRAWAL_REJECTED,
          targetType: 'WITHDRAWAL',
          targetId: w.withdrawalUid,
          oldValue: { status: fresh.status },
          newValue: { status: WithdrawalStatus.REJECTED, reason: reason.trim() },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      await this.notificationsService.notifyUser(
        {
          userId: w.userId,
          eventType: NotificationEventType.WITHDRAWAL_REJECTED,
          title: 'Withdrawal Rejected & Funds Unlocked',
          message: `Withdrawal ${w.withdrawalUid} was rejected (${reason.trim()}). ${w.amount.toFixed(
            2,
          )} USDT has been unlocked back to your available balance.`,
          metadata: { withdrawalUid: w.withdrawalUid },
        },
        tx,
      );

      return updated;
    });
  }

  async completeWithdrawal(
    uidOrId: string,
    outboundTxHash: string,
    meta: AdminRequestMeta,
  ) {
    const hashCheck = bscTxHashSchema.safeParse(outboundTxHash);
    if (!hashCheck.success) {
      throw new AppException(
        'INVALID_OUTBOUND_TX_HASH',
        hashCheck.error.issues[0]?.message ||
          'Enter a valid 66-character outbound BSC transaction hash.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const normalizedHash = hashCheck.data.toLowerCase();

    const w = await this.prisma.withdrawal.findFirst({
      where: { OR: [{ withdrawalUid: uidOrId }, { id: uidOrId }] },
    });
    if (!w) {
      throw new AppException(
        'WITHDRAWAL_NOT_FOUND',
        'Withdrawal request was not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      w.status !== WithdrawalStatus.APPROVED &&
      w.status !== WithdrawalStatus.PROCESSING
    ) {
      throw new AppException(
        'WITHDRAWAL_MUST_BE_APPROVED_FIRST',
        `Withdrawal must be APPROVED before completion (current status: ${w.status}).`,
        HttpStatus.CONFLICT,
      );
    }

    const dupTx = await this.prisma.blockchainTransaction.findUnique({
      where: { transactionHash: normalizedHash },
    });
    if (dupTx) {
      throw new AppException(
        'DUPLICATE_TRANSACTION_HASH',
        'This blockchain transaction hash has already been recorded.',
        HttpStatus.CONFLICT,
      );
    }

    const runtime = await this.settingsService.getRuntimeSettings();

    return this.prisma.$transaction(async (tx) => {
      if (typeof (tx as { $queryRaw?: unknown }).$queryRaw === 'function') {
        await tx.$queryRaw`SELECT id FROM withdrawals WHERE id = ${w.id} FOR UPDATE`;
      }
      const fresh = await tx.withdrawal.findUniqueOrThrow({
        where: { id: w.id },
      });
      if (fresh.status === WithdrawalStatus.COMPLETED) {
        throw new AppException(
          'WITHDRAWAL_ALREADY_COMPLETED',
          'This withdrawal has already been completed.',
          HttpStatus.CONFLICT,
        );
      }

      const ledgerEntry = await this.ledgerService.finalizeCompletedWithdrawal(
        tx,
        {
          userId: w.userId,
          amount: w.amount,
          withdrawalUid: w.withdrawalUid,
          transactionHash: normalizedHash,
          idempotencyKey: `withdrawal:complete:${w.id}`,
          adminId: meta.adminId,
        },
      );

      const updated = await tx.withdrawal.update({
        where: { id: w.id },
        data: {
          status: WithdrawalStatus.COMPLETED,
          transactionHash: normalizedHash,
          adminId: meta.adminId,
          completedAt: new Date(),
        },
      });

      await tx.blockchainTransaction.create({
        data: {
          transactionHash: normalizedHash,
          withdrawalId: w.id,
          direction: 'OUTBOUND',
          verificationMode: runtime.blockchainMode,
          network: 'BNB_SMART_CHAIN',
          chainId: runtime.chainId,
          fromAddress: runtime.receivingWalletAddress,
          toAddress: w.destinationAddress,
          tokenContract: runtime.usdtContractAddress,
          tokenAmount: w.netAmount,
          txSucceeded: true,
          isValid: true,
        },
      });

      await this.auditService.record(
        {
          adminId: meta.adminId,
          actorRole: meta.adminRole,
          action: AuditAction.WITHDRAWAL_COMPLETED,
          targetType: 'WITHDRAWAL',
          targetId: w.withdrawalUid,
          oldValue: { status: fresh.status },
          newValue: {
            status: WithdrawalStatus.COMPLETED,
            transactionHash: normalizedHash,
            ledgerUid: ledgerEntry.ledgerUid,
          },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      await this.notificationsService.notifyUser(
        {
          userId: w.userId,
          eventType: NotificationEventType.WITHDRAWAL_COMPLETED,
          title: 'Withdrawal Settled On-Chain',
          message: `Your withdrawal ${w.withdrawalUid} (${w.netAmount.toFixed(
            2,
          )} USDT) has been completed. Tx: ${normalizedHash.slice(0, 14)}...`,
          metadata: {
            withdrawalUid: w.withdrawalUid,
            transactionHash: normalizedHash,
          },
        },
        tx,
      );

      return { withdrawal: updated, ledgerEntry };
    });
  }

  async listAllLedger(page = 1, limit = 40) {
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    const [items, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
        include: {
          user: { select: { publicUid: true, name: true, email: true } },
        },
      }),
      this.prisma.ledgerEntry.count(),
    ]);
    return { items, total, page: p, limit: l };
  }

  async listBlockchainTransactions() {
    return this.prisma.blockchainTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        deposit: { select: { depositUid: true, status: true } },
        withdrawal: { select: { withdrawalUid: true, status: true } },
      },
    });
  }

  async listSettings() {
    return this.prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async updateSetting(
    dto: { key: string; value: string; description?: string },
    meta: AdminRequestMeta,
  ) {
    const { oldValue, updated } = await this.settingsService.upsertSetting({
      key: dto.key.trim().toUpperCase(),
      value: dto.value.trim(),
      description: dto.description,
      updatedById: meta.adminId,
    });

    await this.auditService.record({
      adminId: meta.adminId,
      actorRole: meta.adminRole,
      action: AuditAction.SYSTEM_SETTING_CHANGED,
      targetType: 'SYSTEM_SETTING',
      targetId: updated.key,
      oldValue: { value: oldValue },
      newValue: { value: updated.value },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return updated;
  }
}

