import { HttpStatus, Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import {
  DepositStatus,
  nextReadableUid,
  Prisma,
} from '@navrix/database';
import { BLOCKCHAIN_DEFAULTS } from '@navrix/config';
import { isAdminRole, NotificationEventType } from '@navrix/types';
import { bscTxHashSchema } from '@navrix/validation';
import { PrismaService } from '../common/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { SettingsService } from '../settings/settings.service';
import { StorageService, StoredScreenshotMetadata } from '../storage/storage.service';
import { BlockchainApiService } from '../blockchain/blockchain.module';
import { NotificationsService } from '../notifications/notifications.service';
import { DepositStateService } from './deposit-state.service';

@Injectable()
export class DepositsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly storageService: StorageService,
    private readonly blockchainService: BlockchainApiService,
    private readonly notificationsService: NotificationsService,
    private readonly depositStateService: DepositStateService,
  ) {}

  /**
   * Generates a dynamic QR code containing ONLY public payment information
   * (receiving BEP-20 wallet address). Never encodes private keys or secrets.
   */
  async buildDepositQrPayload(receivingAddress: string, amount?: string) {
    // Most BSC wallets (Trust Wallet, MetaMask, Binance) scan raw 0x receiving address reliably
    const qrText = receivingAddress;
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: {
        dark: '#090D16',
        light: '#FFFFFF',
      },
    });

    return {
      qrContent: qrText,
      qrDataUrl,
      token: 'USDT',
      network: 'BNB_SMART_CHAIN',
      networkLabel: BLOCKCHAIN_DEFAULTS.networkDisplayName,
      receivingAddress,
      amount: amount || null,
      warning: BLOCKCHAIN_DEFAULTS.networkWarning,
      reviewNotice: BLOCKCHAIN_DEFAULTS.reviewSlaNotice,
    };
  }

  async getPublicDepositConfig() {
    const runtime = await this.settingsService.getRuntimeSettings();
    const qr = await this.buildDepositQrPayload(runtime.receivingWalletAddress);
    const plans = await this.prisma.investmentPlan.findMany({
      where: { isActive: true },
      orderBy: { minAmount: 'asc' },
    });

    return {
      depositsEnabled: runtime.depositsEnabled && !runtime.maintenanceMode,
      blockchainMode: runtime.blockchainMode,
      minDeposit: runtime.minDeposit,
      maxDeposit: runtime.maxDeposit,
      requiredConfirmations: runtime.requiredConfirmations,
      depositExpiryMinutes: runtime.depositExpiryMinutes,
      reviewSlaHours: runtime.reviewSlaHours,
      ...qr,
      plans,
    };
  }

  async createDeposit(params: {
    userId: string;
    amount: number;
    network?: string;
    planCode?: string;
  }) {
    const runtime = await this.settingsService.getRuntimeSettings();
    if (runtime.maintenanceMode || !runtime.depositsEnabled) {
      throw new AppException(
        'DEPOSITS_TEMPORARILY_PAUSED',
        'New deposit requests are temporarily paused by platform administration.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (params.network && params.network !== 'BNB_SMART_CHAIN') {
      throw new AppException(
        'UNSUPPORTED_NETWORK',
        'Only BNB Smart Chain (BEP-20) is supported for USDT deposits.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      !Number.isFinite(params.amount) ||
      params.amount < runtime.minDeposit ||
      params.amount > runtime.maxDeposit
    ) {
      throw new AppException(
        'DEPOSIT_AMOUNT_OUT_OF_RANGE',
        `Deposit amount must be between ${runtime.minDeposit} USDT and ${runtime.maxDeposit} USDT.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (params.planCode) {
      const plan = await this.prisma.investmentPlan.findUnique({
        where: { code: params.planCode },
      });
      if (!plan || !plan.isActive) {
        throw new AppException(
          'INVALID_INVESTMENT_PLAN',
          'Selected investment plan does not exist or is inactive.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const expiresAt = new Date(
      Date.now() + runtime.depositExpiryMinutes * 60_000,
    );
    const requestedDecimal = new Prisma.Decimal(params.amount.toFixed(8));

    const deposit = await this.prisma.$transaction(async (tx) => {
      const depositUid = await nextReadableUid(tx, 'DEP', true);
      return tx.deposit.create({
        data: {
          depositUid,
          userId: params.userId,
          requestedAmount: requestedDecimal,
          token: 'USDT',
          network: 'BNB_SMART_CHAIN',
          receivingAddress: runtime.receivingWalletAddress,
          planCode: params.planCode || null,
          status: DepositStatus.PENDING_PAYMENT,
          cryptoAmount: requestedDecimal,
          cryptoCurrency: 'USDT',
          expiresAt,
        },
      });
    });

    const qr = await this.buildDepositQrPayload(
      deposit.receivingAddress,
      deposit.requestedAmount.toFixed(2),
    );

    return {
      ...this.formatDeposit(deposit),
      paymentInstructions: qr,
    };
  }

  async listUserDeposits(userId: string) {
    const items = await this.prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        submission: true,
        blockchainTx: true,
        investment: true,
      },
    });
    return items.map((d) => this.formatDeposit(d));
  }

  async getUserDepositByUid(userId: string, uidOrId: string) {
    const deposit = await this.prisma.deposit.findFirst({
      where: {
        userId,
        OR: [{ depositUid: uidOrId }, { id: uidOrId }],
      },
      include: {
        submission: true,
        blockchainTx: true,
        investment: true,
      },
    });

    if (!deposit) {
      throw new AppException(
        'DEPOSIT_NOT_FOUND',
        'Deposit record was not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    const qr = await this.buildDepositQrPayload(
      deposit.receivingAddress,
      deposit.requestedAmount.toFixed(2),
    );

    return {
      ...this.formatDeposit(deposit),
      paymentInstructions: qr,
    };
  }

  async submitPayment(params: {
    userId: string;
    depositUidOrId: string;
    transactionHash: string;
    notes?: string;
    screenshotFile?: { buffer: Buffer; mimetype: string; size: number };
    ipAddress?: string;
  }) {
    const hashParse = bscTxHashSchema.safeParse(params.transactionHash);
    if (!hashParse.success) {
      throw new AppException(
        'INVALID_TRANSACTION_HASH',
        hashParse.error.issues[0]?.message ||
          'Enter a valid 66-character BNB Smart Chain transaction hash (0x...).',
        HttpStatus.BAD_REQUEST,
      );
    }
    const normalizedHash = hashParse.data.toLowerCase();

    const deposit = await this.prisma.deposit.findFirst({
      where: {
        userId: params.userId,
        OR: [
          { depositUid: params.depositUidOrId },
          { id: params.depositUidOrId },
        ],
      },
      include: { submission: true },
    });

    if (!deposit) {
      throw new AppException(
        'DEPOSIT_NOT_FOUND',
        'Deposit request was not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (deposit.submission || deposit.status !== DepositStatus.PENDING_PAYMENT) {
      throw new AppException(
        'DEPOSIT_ALREADY_SUBMITTED',
        'Payment details have already been submitted for this deposit request.',
        HttpStatus.CONFLICT,
      );
    }

    if (deposit.expiresAt < new Date()) {
      this.depositStateService.assertTransition(
        deposit.status,
        DepositStatus.EXPIRED,
      );
      await this.prisma.deposit.update({
        where: { id: deposit.id },
        data: { status: DepositStatus.EXPIRED },
      });
      throw new AppException(
        'DEPOSIT_EXPIRED',
        'This deposit request has expired. Please create a new deposit request.',
        HttpStatus.CONFLICT,
      );
    }

    // Global duplicate transaction hash protection across ALL users and deposits
    const [dupSubmission, dupChainTx] = await Promise.all([
      this.prisma.paymentSubmission.findUnique({
        where: { transactionHash: normalizedHash },
      }),
      this.prisma.blockchainTransaction.findUnique({
        where: { transactionHash: normalizedHash },
      }),
    ]);

    if (dupSubmission || dupChainTx) {
      throw new AppException(
        'DUPLICATE_TRANSACTION_HASH',
        'This blockchain transaction hash has already been used and cannot credit another deposit.',
        HttpStatus.CONFLICT,
      );
    }

    let screenshotMeta: StoredScreenshotMetadata | null = null;
    if (params.screenshotFile) {
      screenshotMeta = await this.storageService.savePaymentScreenshot(
        params.screenshotFile,
      );
    }

    const runtime = await this.settingsService.getRuntimeSettings();
    const submittedAt = new Date();
    const reviewDeadline = new Date(
      submittedAt.getTime() + runtime.reviewSlaHours * 3600_000,
    );

    // Step 1: Transition PENDING_PAYMENT -> PAYMENT_SUBMITTED atomically
    this.depositStateService.assertTransition(
      deposit.status,
      DepositStatus.PAYMENT_SUBMITTED,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentSubmission.create({
        data: {
          depositId: deposit.id,
          userId: params.userId,
          transactionHash: normalizedHash,
          screenshotStorageKey: screenshotMeta?.storageKey || null,
          screenshotMimeType: screenshotMeta?.mimeType || null,
          screenshotSizeBytes: screenshotMeta?.sizeBytes || null,
          notes: params.notes?.trim() || null,
          submittedIp: params.ipAddress || null,
        },
      });

      await tx.deposit.update({
        where: { id: deposit.id },
        data: {
          status: DepositStatus.PAYMENT_SUBMITTED,
          submittedAt,
          reviewDeadline,
        },
      });

      await this.notificationsService.notifyUser(
        {
          userId: params.userId,
          eventType: NotificationEventType.DEPOSIT_SUBMITTED,
          title: 'Deposit Payment Submitted',
          message: `Your payment for ${deposit.depositUid} has been submitted and is under review. It may take up to 24 hours.`,
          metadata: { depositUid: deposit.depositUid },
        },
        tx,
      );
    });

    // Step 2: Run server-side blockchain verification (never trusts screenshot or user claims)
    const verification = await this.blockchainService.verifyDepositOnChain({
      depositId: deposit.id,
      transactionHash: normalizedHash,
      expectedAmount: deposit.requestedAmount.toString(),
      expectedReceivingAddress: deposit.receivingAddress,
    });

    // Step 3: Persist blockchain metadata and advance to BLOCKCHAIN_DETECTED -> UNDER_REVIEW
    // Note: NEVER auto-approves; Admin must manually verify and approve!
    const nextStatus = verification.isValid
      ? DepositStatus.BLOCKCHAIN_DETECTED
      : DepositStatus.UNDER_REVIEW;

    this.depositStateService.assertTransition(
      DepositStatus.PAYMENT_SUBMITTED,
      nextStatus,
    );

    const updatedDeposit = await this.prisma.$transaction(async (tx) => {
      await tx.blockchainTransaction.upsert({
        where: { transactionHash: normalizedHash },
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
          transactionHash: normalizedHash,
          depositId: deposit.id,
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

      // Transition BLOCKCHAIN_DETECTED -> UNDER_REVIEW so admin queue tracks SLA
      let finalStatus: DepositStatus = nextStatus;
      if (nextStatus === DepositStatus.BLOCKCHAIN_DETECTED) {
        this.depositStateService.assertTransition(
          DepositStatus.BLOCKCHAIN_DETECTED,
          DepositStatus.UNDER_REVIEW,
        );
        finalStatus = DepositStatus.UNDER_REVIEW;

        await this.notificationsService.notifyUser(
          {
            userId: params.userId,
            eventType: NotificationEventType.BLOCKCHAIN_TX_DETECTED,
            title: 'Blockchain Transaction Detected',
            message: `On-chain BEP-20 transfer detected for ${deposit.depositUid}. Queued for 24-hour admin compliance review.`,
            metadata: {
              depositUid: deposit.depositUid,
              transactionHash: normalizedHash,
            },
          },
          tx,
        );
      }

      return tx.deposit.update({
        where: { id: deposit.id },
        data: { status: finalStatus },
        include: {
          submission: true,
          blockchainTx: true,
          investment: true,
        },
      });
    });

    return {
      ...this.formatDeposit(updatedDeposit),
      reviewNotice: BLOCKCHAIN_DEFAULTS.reviewSlaNotice,
    };
  }

  async readAuthorizedScreenshot(params: {
    requesterId: string;
    requesterRole: string;
    depositUidOrId: string;
  }) {
    const deposit = await this.prisma.deposit.findFirst({
      where: {
        OR: [
          { depositUid: params.depositUidOrId },
          { id: params.depositUidOrId },
        ],
      },
      include: { submission: true },
    });

    if (!deposit || !deposit.submission?.screenshotStorageKey) {
      throw new AppException(
        'SCREENSHOT_NOT_FOUND',
        'No payment screenshot was uploaded for this deposit.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      deposit.userId !== params.requesterId &&
      !isAdminRole(params.requesterRole)
    ) {
      throw new AppException(
        'FORBIDDEN_SCREENSHOT_ACCESS',
        'You are not authorized to access this payment screenshot.',
        HttpStatus.FORBIDDEN,
      );
    }

    const buffer = await this.storageService.readPaymentScreenshot(
      deposit.submission.screenshotStorageKey,
    );

    return {
      buffer,
      mimeType: deposit.submission.screenshotMimeType || 'image/png',
    };
  }

  private formatDeposit(deposit: {
    depositUid: string;
    requestedAmount: Prisma.Decimal;
    verifiedAmount: Prisma.Decimal | null;
    token: string;
    network: string;
    receivingAddress: string;
    planCode: string | null;
    status: DepositStatus;
    submittedAt: Date | null;
    reviewDeadline: Date | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    expiresAt: Date;
    createdAt: Date;
    submission?: {
      transactionHash: string;
      screenshotStorageKey: string | null;
      notes: string | null;
      createdAt: Date;
    } | null;
    blockchainTx?: {
      transactionHash: string;
      verificationMode: string;
      blockNumber: bigint | null;
      fromAddress: string | null;
      toAddress: string | null;
      tokenContract: string | null;
      tokenAmount: Prisma.Decimal | null;
      confirmationCount: number;
      txSucceeded: boolean;
      isValid: boolean;
      failureCode: string | null;
      failureReason: string | null;
      verifiedAt: Date;
    } | null;
    investment?: {
      investmentUid: string;
      principalAmount: Prisma.Decimal;
      interestRate: Prisma.Decimal;
      interestModel: string;
      status: string;
      maturityDate: Date;
    } | null;
  }) {
    return {
      depositUid: deposit.depositUid,
      requestedAmount: deposit.requestedAmount.toFixed(2),
      verifiedAmount: deposit.verifiedAmount
        ? deposit.verifiedAmount.toFixed(2)
        : null,
      token: deposit.token,
      network: deposit.network,
      networkLabel: BLOCKCHAIN_DEFAULTS.networkDisplayName,
      receivingAddress: deposit.receivingAddress,
      planCode: deposit.planCode,
      status: deposit.status,
      submittedAt: deposit.submittedAt,
      reviewDeadline: deposit.reviewDeadline,
      reviewedAt: deposit.reviewedAt,
      rejectionReason: deposit.rejectionReason,
      expiresAt: deposit.expiresAt,
      createdAt: deposit.createdAt,
      hasScreenshot: Boolean(deposit.submission?.screenshotStorageKey),
      transactionHash: deposit.submission?.transactionHash || null,
      notes: deposit.submission?.notes || null,
      blockchainVerification: deposit.blockchainTx
        ? {
            transactionHash: deposit.blockchainTx.transactionHash,
            mode: deposit.blockchainTx.verificationMode,
            isValid: deposit.blockchainTx.isValid,
            txSucceeded: deposit.blockchainTx.txSucceeded,
            actualAmount: deposit.blockchainTx.tokenAmount
              ? deposit.blockchainTx.tokenAmount.toFixed(2)
              : null,
            fromAddress: deposit.blockchainTx.fromAddress,
            toAddress: deposit.blockchainTx.toAddress,
            tokenContract: deposit.blockchainTx.tokenContract,
            blockNumber: deposit.blockchainTx.blockNumber
              ? deposit.blockchainTx.blockNumber.toString()
              : null,
            confirmationCount: deposit.blockchainTx.confirmationCount,
            failureCode: deposit.blockchainTx.failureCode,
            failureReason: deposit.blockchainTx.failureReason,
            verifiedAt: deposit.blockchainTx.verifiedAt,
          }
        : null,
      investment: deposit.investment
        ? {
            investmentUid: deposit.investment.investmentUid,
            principalAmount: deposit.investment.principalAmount.toFixed(2),
            interestRate: deposit.investment.interestRate.toFixed(2),
            interestModel: deposit.investment.interestModel,
            status: deposit.investment.status,
            maturityDate: deposit.investment.maturityDate,
          }
        : null,
    };
  }
}
