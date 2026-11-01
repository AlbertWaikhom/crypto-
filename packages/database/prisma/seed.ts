import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

for (const rel of ['../.env', '../../../backend/.env', '../../../.env']) {
  const envPath = path.resolve(__dirname, rel);
  if (!fs.existsSync(envPath)) continue;
  for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
import {
  PrismaClient,
  UserRole,
  UserStatus,
  DepositStatus,
  LedgerTransactionType,
  LedgerDirection,
  InterestCalculationModel,
  InvestmentStatus,
  WithdrawalStatus,
} from '@prisma/client';
import { BLOCKCHAIN_DEFAULTS } from '@navrix/config';
import { nextReadableUid } from '../src/index';

const prisma = new PrismaClient();

/**
 * DEVELOPMENT / TEST SEED DATA ONLY.
 * Explicitly guarded so it can NEVER run in NODE_ENV=production.
 */
async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run development seed data in production environment.');
  }

  console.log('🌱 [DEV SEED] Initializing NAVRIX MySQL development seed data...');

  const defaultSettings: Array<{
    key: string;
    value: string;
    category: string;
    isPublic: boolean;
    description: string;
  }> = [
    {
      key: 'BLOCKCHAIN_MODE',
      value: process.env.BLOCKCHAIN_MODE || 'MOCK',
      category: 'BLOCKCHAIN',
      isPublic: true,
      description: 'Active blockchain verification mode: MOCK | TESTNET | MAINNET',
    },
    {
      key: 'BLOCKCHAIN_NETWORK',
      value: BLOCKCHAIN_DEFAULTS.networkCode,
      category: 'BLOCKCHAIN',
      isPublic: true,
      description: 'Supported deposit/withdrawal blockchain network',
    },
    {
      key: 'CHAIN_ID',
      value: '97',
      category: 'BLOCKCHAIN',
      isPublic: true,
      description: 'Active chain ID (97 = BSC Testnet, 56 = BSC Mainnet)',
    },
    {
      key: 'RECEIVING_WALLET_ADDRESS',
      value:
        process.env.RECEIVING_WALLET_ADDRESS ||
        BLOCKCHAIN_DEFAULTS.defaultReceivingAddress,
      category: 'BLOCKCHAIN',
      isPublic: true,
      description: 'Authoritative public BEP-20 USDT deposit receiving wallet address',
    },
    {
      key: 'USDT_CONTRACT_ADDRESS',
      value: BLOCKCHAIN_DEFAULTS.testnetUsdtContract,
      category: 'BLOCKCHAIN',
      isPublic: true,
      description: 'Active BEP-20 USDT smart contract address',
    },
    {
      key: 'REQUIRED_CONFIRMATIONS',
      value: '12',
      category: 'BLOCKCHAIN',
      isPublic: true,
      description: 'Minimum block confirmations required for deposit verification',
    },
    {
      key: 'MIN_DEPOSIT',
      value: '10',
      category: 'LIMITS',
      isPublic: true,
      description: 'Minimum single deposit amount in USDT',
    },
    {
      key: 'MAX_DEPOSIT',
      value: '100000',
      category: 'LIMITS',
      isPublic: true,
      description: 'Maximum single deposit amount in USDT',
    },
    {
      key: 'MIN_WITHDRAWAL',
      value: '20',
      category: 'LIMITS',
      isPublic: true,
      description: 'Minimum withdrawal request amount in USDT',
    },
    {
      key: 'MAX_WITHDRAWAL',
      value: '50000',
      category: 'LIMITS',
      isPublic: true,
      description: 'Maximum withdrawal request amount in USDT',
    },
    {
      key: 'DEPOSIT_EXPIRY_MINUTES',
      value: '120',
      category: 'SLA',
      isPublic: true,
      description: 'Minutes before an unsubmitted deposit request expires',
    },
    {
      key: 'REVIEW_SLA_HOURS',
      value: '24',
      category: 'SLA',
      isPublic: true,
      description: 'Target manual compliance/admin review turnaround hours',
    },
    {
      key: 'DEPOSITS_ENABLED',
      value: 'true',
      category: 'CIRCUIT_BREAKER',
      isPublic: true,
      description: 'Master Admin circuit breaker for new deposit requests',
    },
    {
      key: 'WITHDRAWALS_ENABLED',
      value: 'true',
      category: 'CIRCUIT_BREAKER',
      isPublic: true,
      description: 'Master Admin circuit breaker for new withdrawal requests',
    },
    {
      key: 'MAINTENANCE_MODE',
      value: 'false',
      category: 'CIRCUIT_BREAKER',
      isPublic: true,
      description: 'Master Admin platform-wide maintenance pause flag',
    },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { category: s.category, isPublic: s.isPublic, description: s.description },
      create: s,
    });
  }

  // Investment plans (configurable, never hard-coded)
  const corePlan = await prisma.investmentPlan.upsert({
    where: { code: 'NAVRIX-CORE-30D' },
    update: {},
    create: {
      code: 'NAVRIX-CORE-30D',
      name: '[DEV SEED] Core Yield Vault (30 Days)',
      description: 'Configurable 30-day USDT allocation plan for development & QA testing.',
      interestModel: InterestCalculationModel.PERCENTAGE,
      interestRate: '5.0000',
      calculationFrequency: 'MONTHLY',
      durationDays: 30,
      minAmount: '50.00000000',
      maxAmount: '50000.00000000',
      isActive: true,
    },
  });

  await prisma.investmentPlan.upsert({
    where: { code: 'NAVRIX-PRIME-90D' },
    update: {},
    create: {
      code: 'NAVRIX-PRIME-90D',
      name: '[DEV SEED] Prime Institutional Vault (90 Days)',
      description: 'Configurable 90-day USDT allocation plan for development & QA testing.',
      interestModel: InterestCalculationModel.MATURITY,
      interestRate: '16.5000',
      calculationFrequency: 'MATURITY',
      durationDays: 90,
      minAmount: '500.00000000',
      maxAmount: '100000.00000000',
      isActive: true,
    },
  });

  const adminPasswordHash = await bcrypt.hash('MasterAdmin@123', 12);
  const staffPasswordHash = await bcrypt.hash('StaffAdmin@123', 12);
  const userPasswordHash = await bcrypt.hash('NavrixUser@123', 12);

  // 1. Master Admin
  const masterAdmin = await prisma.user.upsert({
    where: { email: 'masteradmin@navrix.local' },
    update: {},
    create: {
      publicUid: await nextReadableUid(prisma, 'USR', false),
      name: '[DEV] Master Admin',
      email: 'masteradmin@navrix.local',
      passwordHash: adminPasswordHash,
      role: UserRole.MASTER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  // 2. Operations Admin
  const opsAdmin = await prisma.user.upsert({
    where: { email: 'admin@navrix.local' },
    update: {},
    create: {
      publicUid: await nextReadableUid(prisma, 'USR', false),
      name: '[DEV] Operations Admin',
      email: 'admin@navrix.local',
      passwordHash: staffPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  // 3. Normal User 1 (with sample approved deposit, active investment, interest credit & withdrawal)
  let userOne = await prisma.user.findUnique({ where: { email: 'alice.test@navrix.local' } });
  if (!userOne) {
    userOne = await prisma.user.create({
      data: {
        publicUid: await nextReadableUid(prisma, 'USR', false),
        name: '[DEV] Alice Mercer',
        email: 'alice.test@navrix.local',
        phone: '+1 555 010 1001',
        passwordHash: userPasswordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        complianceProfile: {
          create: {
            country: 'United States',
            termsAcceptedAt: new Date(),
            privacyAcceptedAt: new Date(),
            riskDisclosureAcceptedAt: new Date(),
          },
        },
        wallets: {
          create: {
            asset: 'USDT',
            availableBalance: '80.00000000',
            lockedBalance: '25.00000000',
            investedBalance: '100.00000000',
            pendingWithdrawal: '25.00000000',
          },
        },
      },
      include: { wallets: true },
    });

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId_asset: { userId: userOne.id, asset: 'USDT' } },
    });

    const sampleTxHash =
      '0x1111111111111111111111111111111111111111111111111111111111111101';
    const depUid = await nextReadableUid(prisma, 'DEP', true);
    const deposit = await prisma.deposit.create({
      data: {
        depositUid: depUid,
        userId: userOne.id,
        requestedAmount: '100.00000000',
        verifiedAmount: '100.00000000',
        token: 'USDT',
        network: 'BNB_SMART_CHAIN',
        receivingAddress: BLOCKCHAIN_DEFAULTS.defaultReceivingAddress,
        planCode: corePlan.code,
        status: DepositStatus.APPROVED,
        submittedAt: new Date(Date.now() - 3600_000 * 6),
        reviewDeadline: new Date(Date.now() + 3600_000 * 18),
        reviewedAt: new Date(Date.now() - 3600_000 * 5),
        reviewedById: opsAdmin.id,
        expiresAt: new Date(Date.now() + 3600_000 * 2),
      },
    });

    await prisma.paymentSubmission.create({
      data: {
        depositId: deposit.id,
        userId: userOne.id,
        transactionHash: sampleTxHash,
        notes: '[DEV SEED] Verified mock BEP-20 transfer',
      },
    });

    await prisma.blockchainTransaction.create({
      data: {
        transactionHash: sampleTxHash,
        depositId: deposit.id,
        direction: 'INBOUND',
        verificationMode: 'MOCK',
        network: 'BNB_SMART_CHAIN',
        chainId: 97,
        blockNumber: BigInt(44100250),
        blockTimestamp: new Date(Date.now() - 3600_000 * 6),
        fromAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        toAddress: BLOCKCHAIN_DEFAULTS.defaultReceivingAddress,
        tokenContract: BLOCKCHAIN_DEFAULTS.testnetUsdtContract,
        tokenAmount: '100.00000000',
        confirmationCount: 24,
        txSucceeded: true,
        isValid: true,
      },
    });

    // Ledger Entry 1: DEPOSIT +100 USDT
    await prisma.ledgerEntry.create({
      data: {
        ledgerUid: await nextReadableUid(prisma, 'LED', true),
        userId: userOne.id,
        walletId: wallet.id,
        transactionType: LedgerTransactionType.DEPOSIT,
        direction: LedgerDirection.CREDIT,
        asset: 'USDT',
        amount: '100.00000000',
        balanceBefore: '0.00000000',
        balanceAfter: '100.00000000',
        referenceType: 'DEPOSIT',
        referenceId: deposit.depositUid,
        idempotencyKey: `seed:deposit:${deposit.id}`,
        description: `[DEV SEED] Approved BEP-20 USDT deposit (${deposit.depositUid})`,
        createdById: opsAdmin.id,
      },
    });

    // Investment record: INV-xxxx
    const inv = await prisma.investment.create({
      data: {
        investmentUid: await nextReadableUid(prisma, 'INV', true),
        userId: userOne.id,
        depositId: deposit.id,
        planId: corePlan.id,
        principalAmount: '100.00000000',
        asset: 'USDT',
        startDate: new Date(Date.now() - 3600_000 * 5),
        maturityDate: new Date(Date.now() + 86400_000 * 25),
        interestModel: InterestCalculationModel.PERCENTAGE,
        interestRate: '5.0000',
        interestAmount: '5.00000000',
        status: InvestmentStatus.ACTIVE,
      },
    });

    // Ledger Entry 2: INTEREST +5 USDT (plus extra +100 liquidity seed deposit so withdrawal test has available funds)
    const interestLedger = await prisma.ledgerEntry.create({
      data: {
        ledgerUid: await nextReadableUid(prisma, 'LED', true),
        userId: userOne.id,
        walletId: wallet.id,
        transactionType: LedgerTransactionType.INTEREST,
        direction: LedgerDirection.CREDIT,
        asset: 'USDT',
        amount: '5.00000000',
        balanceBefore: '100.00000000',
        balanceAfter: '105.00000000',
        referenceType: 'INVESTMENT',
        referenceId: inv.investmentUid,
        idempotencyKey: `seed:interest:${inv.id}:2026-11-P1`,
        description: `[DEV SEED] 5% yield credit for ${inv.investmentUid}`,
        createdById: masterAdmin.id,
      },
    });

    await prisma.interestRecord.create({
      data: {
        interestUid: await nextReadableUid(prisma, 'INT', true),
        investmentId: inv.id,
        userId: userOne.id,
        periodKey: '2026-11-P1',
        calculationModel: InterestCalculationModel.PERCENTAGE,
        rateApplied: '5.0000',
        principalSnapshot: '100.00000000',
        amount: '5.00000000',
        ledgerEntryId: interestLedger.id,
        status: 'CREDITED',
        description: '[DEV SEED] Cycle 1 yield distribution',
        createdById: masterAdmin.id,
      },
    });

    // Ledger Entry 3: ADJUSTMENT +100 USDT (clearly marked dev test liquidity)
    await prisma.ledgerEntry.create({
      data: {
        ledgerUid: await nextReadableUid(prisma, 'LED', true),
        userId: userOne.id,
        walletId: wallet.id,
        transactionType: LedgerTransactionType.ADJUSTMENT,
        direction: LedgerDirection.CREDIT,
        asset: 'USDT',
        amount: '100.00000000',
        balanceBefore: '105.00000000',
        balanceAfter: '205.00000000',
        referenceType: 'SEED_LIQUIDITY',
        referenceId: 'DEV-SEED-001',
        idempotencyKey: `seed:adj:${userOne.id}:001`,
        description: '[DEV SEED] Testnet available balance credit for withdrawal QA',
        createdById: masterAdmin.id,
      },
    });

    // Sample pending withdrawal locking 25 USDT (Available: 80, Locked: 25, Invested: 100 => Total: 205)
    await prisma.withdrawal.create({
      data: {
        withdrawalUid: await nextReadableUid(prisma, 'WDR', true),
        userId: userOne.id,
        amount: '25.00000000',
        feeAmount: '0.00000000',
        netAmount: '25.00000000',
        asset: 'USDT',
        network: 'BNB_SMART_CHAIN',
        destinationAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        status: WithdrawalStatus.PENDING_REVIEW,
      },
    });
  }

  // 4. Normal User 2 (clean zero-balance empty state + 1 under-review deposit for Admin Queue testing)
  let userTwo = await prisma.user.findUnique({ where: { email: 'rohan.test@navrix.local' } });
  if (!userTwo) {
    userTwo = await prisma.user.create({
      data: {
        publicUid: await nextReadableUid(prisma, 'USR', false),
        name: '[DEV] Rohan Kapoor',
        email: 'rohan.test@navrix.local',
        phone: '+91 98765 43210',
        passwordHash: userPasswordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        wallets: {
          create: {
            asset: 'USDT',
            availableBalance: '0.00000000',
            lockedBalance: '0.00000000',
            investedBalance: '0.00000000',
            pendingWithdrawal: '0.00000000',
          },
        },
      },
    });

    const pendingTxHash =
      '0x2222222222222222222222222222222222222222222222222222222222222202';
    const pendingDep = await prisma.deposit.create({
      data: {
        depositUid: await nextReadableUid(prisma, 'DEP', true),
        userId: userTwo.id,
        requestedAmount: '250.00000000',
        token: 'USDT',
        network: 'BNB_SMART_CHAIN',
        receivingAddress: BLOCKCHAIN_DEFAULTS.defaultReceivingAddress,
        planCode: corePlan.code,
        status: DepositStatus.UNDER_REVIEW,
        submittedAt: new Date(Date.now() - 1800_000),
        reviewDeadline: new Date(Date.now() + 86400_000 - 1800_000),
        expiresAt: new Date(Date.now() + 7200_000),
      },
    });

    await prisma.paymentSubmission.create({
      data: {
        depositId: pendingDep.id,
        userId: userTwo.id,
        transactionHash: pendingTxHash,
        notes: '[DEV SEED] Awaiting admin verification in queue',
      },
    });
  }

  console.log('✅ [DEV SEED] Seed completed successfully!');
  console.log('   Master Admin : masteradmin@navrix.local / MasterAdmin@123');
  console.log('   Staff Admin  : admin@navrix.local       / StaffAdmin@123');
  console.log('   Demo User 1  : alice.test@navrix.local  / NavrixUser@123');
  console.log('   Demo User 2  : rohan.test@navrix.local  / NavrixUser@123');
}

main()
  .catch((err) => {
    console.error('❌ [DEV SEED] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

