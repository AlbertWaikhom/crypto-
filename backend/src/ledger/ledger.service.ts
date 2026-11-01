import { HttpStatus, Injectable } from '@nestjs/common';
import {
  LedgerDirection,
  LedgerTransactionType,
  nextReadableUid,
  Prisma,
  PrismaTransactionClient,
} from '@navrix/database';
import { PrismaService } from '../common/prisma.service';
import { AppException } from '../common/errors/app.exception';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Acquires an exclusive row lock (SELECT ... FOR UPDATE) on the user's USDT wallet
   * inside an active MySQL transaction, creating the wallet row first if missing.
   */
  async lockUserWallet(
    tx: PrismaTransactionClient,
    userId: string,
    asset = 'USDT',
  ) {
    let wallet = await tx.wallet.findUnique({
      where: { userId_asset: { userId, asset } },
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          userId,
          asset,
          availableBalance: new Prisma.Decimal(0),
          lockedBalance: new Prisma.Decimal(0),
          investedBalance: new Prisma.Decimal(0),
          pendingWithdrawal: new Prisma.Decimal(0),
        },
      });
    }

    // Row-level MySQL lock to serialize concurrent balance mutations
    if (typeof (tx as { $queryRaw?: unknown }).$queryRaw === 'function') {
      await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`;
    }

    return tx.wallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });
  }

  /**
   * Credits an approved deposit into the immutable ledger and allocates principal
   * into investedBalance (when creating an active Investment) or availableBalance.
   */
  async recordApprovedDeposit(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      amount: Prisma.Decimal;
      depositUid: string;
      idempotencyKey: string;
      allocateToInvestment: boolean;
      adminId: string;
      description: string;
    },
  ) {
    if (params.amount.lte(0)) {
      throw new AppException(
        'INVALID_LEDGER_AMOUNT',
        'Deposit credit amount must be strictly positive.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existing = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      throw new AppException(
        'DUPLICATE_LEDGER_ENTRY',
        'A ledger credit already exists for this deposit.',
        HttpStatus.CONFLICT,
      );
    }

    const wallet = await this.lockUserWallet(tx, params.userId, 'USDT');
    const totalBefore = wallet.availableBalance
      .plus(wallet.lockedBalance)
      .plus(wallet.investedBalance);
    const totalAfter = totalBefore.plus(params.amount);

    const ledgerUid = await nextReadableUid(tx, 'LED', true);
    const entry = await tx.ledgerEntry.create({
      data: {
        ledgerUid,
        userId: params.userId,
        walletId: wallet.id,
        transactionType: LedgerTransactionType.DEPOSIT,
        direction: LedgerDirection.CREDIT,
        asset: 'USDT',
        amount: params.amount,
        balanceBefore: totalBefore,
        balanceAfter: totalAfter,
        referenceType: 'DEPOSIT',
        referenceId: params.depositUid,
        idempotencyKey: params.idempotencyKey,
        description: params.description,
        createdById: params.adminId,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: params.allocateToInvestment
        ? {
            investedBalance: wallet.investedBalance.plus(params.amount),
            version: { increment: 1 },
          }
        : {
            availableBalance: wallet.availableBalance.plus(params.amount),
            version: { increment: 1 },
          },
    });

    return entry;
  }

  /**
   * Credits interest/yield as a distinct immutable INTEREST ledger entry into availableBalance.
   */
  async recordInterestCredit(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      amount: Prisma.Decimal;
      investmentUid: string;
      idempotencyKey: string;
      adminId: string;
      description: string;
    },
  ) {
    if (params.amount.lte(0)) {
      throw new AppException(
        'INVALID_INTEREST_AMOUNT',
        'Interest credit amount must be greater than zero.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existing = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      throw new AppException(
        'DUPLICATE_INTEREST_LEDGER',
        'This interest period has already been credited to the ledger.',
        HttpStatus.CONFLICT,
      );
    }

    const wallet = await this.lockUserWallet(tx, params.userId, 'USDT');
    const totalBefore = wallet.availableBalance
      .plus(wallet.lockedBalance)
      .plus(wallet.investedBalance);
    const totalAfter = totalBefore.plus(params.amount);

    const ledgerUid = await nextReadableUid(tx, 'LED', true);
    const entry = await tx.ledgerEntry.create({
      data: {
        ledgerUid,
        userId: params.userId,
        walletId: wallet.id,
        transactionType: LedgerTransactionType.INTEREST,
        direction: LedgerDirection.CREDIT,
        asset: 'USDT',
        amount: params.amount,
        balanceBefore: totalBefore,
        balanceAfter: totalAfter,
        referenceType: 'INVESTMENT',
        referenceId: params.investmentUid,
        idempotencyKey: params.idempotencyKey,
        description: params.description,
        createdById: params.adminId,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: wallet.availableBalance.plus(params.amount),
        version: { increment: 1 },
      },
    });

    return entry;
  }

  /**
   * Locks availableBalance -> lockedBalance when a user requests a withdrawal.
   * Strictly guarantees availableBalance never drops below 0.
   */
  async lockFundsForWithdrawal(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      amount: Prisma.Decimal;
    },
  ) {
    const wallet = await this.lockUserWallet(tx, params.userId, 'USDT');
    if (wallet.availableBalance.lt(params.amount)) {
      throw new AppException(
        'INSUFFICIENT_AVAILABLE_BALANCE',
        `Insufficient available USDT balance. Available: ${wallet.availableBalance.toFixed(
          2,
        )} USDT.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const nextAvailable = wallet.availableBalance.minus(params.amount);
    if (nextAvailable.lt(0)) {
      throw new AppException(
        'NEGATIVE_BALANCE_PREVENTED',
        'Withdrawal would cause negative available balance.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: nextAvailable,
        lockedBalance: wallet.lockedBalance.plus(params.amount),
        pendingWithdrawal: wallet.pendingWithdrawal.plus(params.amount),
        version: { increment: 1 },
      },
    });
  }

  /**
   * Unlocks lockedBalance -> availableBalance if a withdrawal is rejected or fails.
   */
  async unlockRejectedWithdrawal(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      amount: Prisma.Decimal;
    },
  ) {
    const wallet = await this.lockUserWallet(tx, params.userId, 'USDT');
    if (wallet.lockedBalance.lt(params.amount)) {
      throw new AppException(
        'LOCKED_BALANCE_MISMATCH',
        'Locked balance is smaller than the withdrawal unlock amount.',
        HttpStatus.CONFLICT,
      );
    }

    return tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: wallet.availableBalance.plus(params.amount),
        lockedBalance: wallet.lockedBalance.minus(params.amount),
        pendingWithdrawal: Prisma.Decimal.max(
          new Prisma.Decimal(0),
          wallet.pendingWithdrawal.minus(params.amount),
        ),
        version: { increment: 1 },
      },
    });
  }

  /**
   * Finalizes a completed withdrawal: deducts lockedBalance and creates an immutable
   * WITHDRAWAL debit ledger entry referencing the outbound BSC transaction hash.
   */
  async finalizeCompletedWithdrawal(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      amount: Prisma.Decimal;
      withdrawalUid: string;
      transactionHash: string;
      idempotencyKey: string;
      adminId: string;
    },
  ) {
    const existing = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      throw new AppException(
        'WITHDRAWAL_ALREADY_POSTED',
        'A final withdrawal ledger entry already exists for this payout.',
        HttpStatus.CONFLICT,
      );
    }

    const wallet = await this.lockUserWallet(tx, params.userId, 'USDT');
    if (wallet.lockedBalance.lt(params.amount)) {
      throw new AppException(
        'INSUFFICIENT_LOCKED_BALANCE',
        'Locked balance does not cover this withdrawal completion.',
        HttpStatus.CONFLICT,
      );
    }

    const totalBefore = wallet.availableBalance
      .plus(wallet.lockedBalance)
      .plus(wallet.investedBalance);
    const totalAfter = totalBefore.minus(params.amount);

    const ledgerUid = await nextReadableUid(tx, 'LED', true);
    const entry = await tx.ledgerEntry.create({
      data: {
        ledgerUid,
        userId: params.userId,
        walletId: wallet.id,
        transactionType: LedgerTransactionType.WITHDRAWAL,
        direction: LedgerDirection.DEBIT,
        asset: 'USDT',
        amount: params.amount,
        balanceBefore: totalBefore,
        balanceAfter: totalAfter,
        referenceType: 'WITHDRAWAL',
        referenceId: params.withdrawalUid,
        idempotencyKey: params.idempotencyKey,
        description: `Completed USDT withdrawal (${params.withdrawalUid}) — Tx ${params.transactionHash.slice(
          0,
          12,
        )}...`,
        createdById: params.adminId,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        lockedBalance: wallet.lockedBalance.minus(params.amount),
        pendingWithdrawal: Prisma.Decimal.max(
          new Prisma.Decimal(0),
          wallet.pendingWithdrawal.minus(params.amount),
        ),
        version: { increment: 1 },
      },
    });

    return entry;
  }

  /**
   * Master Admin Solvency & Ledger Integrity Verification:
   * Confirms SUM(wallet buckets) === SUM(ledger credits - ledger debits) across the platform.
   */
  async reconcilePlatformLedger() {
    const [wallets, creditAgg, debitAgg] = await Promise.all([
      this.prisma.wallet.findMany({ where: { asset: 'USDT' } }),
      this.prisma.ledgerEntry.aggregate({
        where: { asset: 'USDT', direction: LedgerDirection.CREDIT },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { asset: 'USDT', direction: LedgerDirection.DEBIT },
        _sum: { amount: true },
      }),
    ]);

    let sumAvailable = new Prisma.Decimal(0);
    let sumLocked = new Prisma.Decimal(0);
    let sumInvested = new Prisma.Decimal(0);

    for (const w of wallets) {
      sumAvailable = sumAvailable.plus(w.availableBalance);
      sumLocked = sumLocked.plus(w.lockedBalance);
      sumInvested = sumInvested.plus(w.investedBalance);
    }

    const totalWalletEquity = sumAvailable.plus(sumLocked).plus(sumInvested);
    const totalCredits = creditAgg._sum.amount ?? new Prisma.Decimal(0);
    const totalDebits = debitAgg._sum.amount ?? new Prisma.Decimal(0);
    const netLedgerBalance = totalCredits.minus(totalDebits);
    const discrepancy = totalWalletEquity.minus(netLedgerBalance);

    return {
      isReconciled: discrepancy.abs().lt(new Prisma.Decimal('0.00000001')),
      walletCount: wallets.length,
      sumAvailable: sumAvailable.toFixed(8),
      sumLocked: sumLocked.toFixed(8),
      sumInvested: sumInvested.toFixed(8),
      totalWalletEquity: totalWalletEquity.toFixed(8),
      totalLedgerCredits: totalCredits.toFixed(8),
      totalLedgerDebits: totalDebits.toFixed(8),
      netLedgerBalance: netLedgerBalance.toFixed(8),
      discrepancy: discrepancy.toFixed(8),
      checkedAt: new Date().toISOString(),
    };
  }
}

