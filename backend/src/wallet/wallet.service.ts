import { Injectable } from '@nestjs/common';
import {
  DepositStatus,
  LedgerTransactionType,
  Prisma,
  WithdrawalStatus,
} from '@navrix/database';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string) {
    const [wallet, pendingDepositsAgg, pendingWithdrawalsAgg, interestAgg, recentLedger] =
      await Promise.all([
        this.prisma.wallet.findUnique({
          where: { userId_asset: { userId, asset: 'USDT' } },
        }),
        this.prisma.deposit.aggregate({
          where: {
            userId,
            status: {
              in: [
                DepositStatus.PENDING_PAYMENT,
                DepositStatus.PAYMENT_SUBMITTED,
                DepositStatus.BLOCKCHAIN_DETECTED,
                DepositStatus.UNDER_REVIEW,
              ],
            },
          },
          _sum: { requestedAmount: true },
        }),
        this.prisma.withdrawal.aggregate({
          where: {
            userId,
            status: {
              in: [
                WithdrawalStatus.PENDING_REVIEW,
                WithdrawalStatus.APPROVED,
                WithdrawalStatus.PROCESSING,
              ],
            },
          },
          _sum: { amount: true },
        }),
        this.prisma.ledgerEntry.aggregate({
          where: {
            userId,
            transactionType: LedgerTransactionType.INTEREST,
          },
          _sum: { amount: true },
        }),
        this.prisma.ledgerEntry.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          take: 60,
          select: {
            ledgerUid: true,
            transactionType: true,
            direction: true,
            amount: true,
            balanceAfter: true,
            createdAt: true,
          },
        }),
      ]);

    const available = wallet?.availableBalance ?? new Prisma.Decimal(0);
    const locked = wallet?.lockedBalance ?? new Prisma.Decimal(0);
    const invested = wallet?.investedBalance ?? new Prisma.Decimal(0);
    const total = available.plus(locked).plus(invested);

    const chartSeries = recentLedger.map((entry) => ({
      date: entry.createdAt.toISOString(),
      label: entry.createdAt.toISOString().slice(0, 10),
      balance: Number(entry.balanceAfter.toFixed(2)),
      type: entry.transactionType,
      uid: entry.ledgerUid,
    }));

    return {
      asset: 'USDT',
      totalBalance: total.toFixed(2),
      availableBalance: available.toFixed(2),
      lockedBalance: locked.toFixed(2),
      investedBalance: invested.toFixed(2),
      pendingDeposits: (
        pendingDepositsAgg._sum.requestedAmount ?? new Prisma.Decimal(0)
      ).toFixed(2),
      pendingWithdrawals: (
        pendingWithdrawalsAgg._sum.amount ?? new Prisma.Decimal(0)
      ).toFixed(2),
      totalInterestEarned: (
        interestAgg._sum.amount ?? new Prisma.Decimal(0)
      ).toFixed(2),
      chartSeries,
    };
  }

  async getUserLedger(params: {
    userId: string;
    page?: number;
    limit?: number;
    type?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const where: Prisma.LedgerEntryWhereInput = { userId: params.userId };
    if (params.type) {
      where.transactionType = params.type as LedgerTransactionType;
    }

    const [items, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

