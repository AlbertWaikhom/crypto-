import '../src/load-env';
import 'reflect-metadata';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BLOCKCHAIN_DEFAULTS } from '@navrix/config';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';

// Authentic minimal 1x1 transparent PNG buffer (PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A)
const VALID_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

describe('NAVRIX Live MySQL End-to-End API & Financial Transaction Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tempUploadDir: string;

  const runHex = crypto.randomBytes(6).toString('hex');
  const aliceEmail = `e2e.alice.${runHex}@navrix.local`;
  const bobEmail = `e2e.bob.${runHex}@navrix.local`;
  const validDepositTxHash = `0x7777777777777777777777777777777777777777777777777777${runHex}`;
  const revertedDepositTxHash = `0xfa11000000000000000000000000000000000000000000000000${runHex}`;
  const outboundWithdrawalTxHash = `0x9999999999999999999999999999999999999999999999999999${runHex}`;

  let masterToken = '';
  let adminToken = '';
  let aliceToken = '';
  let aliceRefreshToken = '';
  let bobToken = '';

  let approvedDepositUid = '';
  let rejectedDepositUid = '';
  let activeInvestmentUid = '';
  let rejectedWithdrawalUid = '';
  let completedWithdrawalUid = '';

  beforeAll(async () => {
    tempUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'navrix-uploads-'));
    process.env.BLOCKCHAIN_MODE = 'MOCK';
    process.env.GOOGLE_OAUTH_MODE = 'MOCK';
    process.env.PRIVATE_UPLOAD_DIR = tempUploadDir;
    process.env.UPLOAD_STORAGE_DIR = tempUploadDir;
    process.env.RECEIVING_WALLET_ADDRESS =
      BLOCKCHAIN_DEFAULTS.defaultReceivingAddress;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  }, 60_000);

  afterAll(async () => {
    if (prisma) {
      // Ensure circuit breaker is always left enabled
      await prisma.systemSetting
        .updateMany({
          where: { key: 'DEPOSITS_ENABLED' },
          data: { value: 'true' },
        })
        .catch(() => {});

      // Clean up isolated E2E test-run records from live MySQL while preserving real/seeded accounts
      const testUsers = await prisma.user.findMany({
        where: { email: { in: [aliceEmail, bobEmail] } },
        select: { id: true, publicUid: true },
      });
      const userIds = testUsers.map((u) => u.id);

      if (userIds.length > 0) {
        await prisma.interestRecord.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.investment.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.blockchainTransaction.deleteMany({
          where: {
            transactionHash: {
              in: [validDepositTxHash, revertedDepositTxHash, outboundWithdrawalTxHash],
            },
          },
        });
        await prisma.paymentSubmission.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.deposit.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.withdrawal.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.ledgerEntry.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.wallet.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.authToken.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.complianceProfile.deleteMany({ where: { userId: { in: userIds } } });

        const targetIds = [
          ...testUsers.map((u) => u.publicUid),
          approvedDepositUid,
          rejectedDepositUid,
          activeInvestmentUid,
          rejectedWithdrawalUid,
          completedWithdrawalUid,
        ].filter(Boolean);

        if (targetIds.length > 0) {
          await prisma.auditLog.deleteMany({
            where: { targetId: { in: targetIds } },
          });
        }

        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }

    if (app) {
      await app.close();
    }
    if (tempUploadDir && fs.existsSync(tempUploadDir)) {
      fs.rmSync(tempUploadDir, { recursive: true, force: true });
    }
  }, 60_000);

  it(
    '1. Registers users in live MySQL with readable USR-XXXXXX IDs, verifies email, logs in via Email & Google OAuth, and enforces refresh-token rotation + replay revocation',
    async () => {
      const regAlice = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Alice Live MySQL Investor',
          email: aliceEmail,
          phone: '+1 555 010 1001',
          password: 'NavrixUser2026!',
          acceptTerms: true,
          country: 'Singapore',
        })
        .expect(201);

      expect(regAlice.body.success).toBe(true);
      expect(regAlice.body.data.user.uid).toMatch(/^USR-\d{6}$/);
      expect(regAlice.body.data.user.passwordHash).toBeUndefined();
      const verifyToken = regAlice.body.data.verificationTokenPreview;
      expect(typeof verifyToken).toBe('string');

      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: verifyToken })
        .expect(200);

      const loginAlice = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: aliceEmail,
          password: 'NavrixUser2026!',
        })
        .expect(200);

      aliceToken = loginAlice.body.data.accessToken;
      const rawCookies = loginAlice.headers['set-cookie'];
      const setCookies: string[] = Array.isArray(rawCookies)
        ? rawCookies
        : rawCookies
          ? [rawCookies]
          : [];
      const refreshCookie = setCookies.find((c) =>
        c.startsWith('navrix_refresh_token='),
      );
      expect(refreshCookie).toBeDefined();
      aliceRefreshToken = refreshCookie!.split(';')[0]!.split('=')[1]!;

      const rotated = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: aliceRefreshToken })
        .expect(200);
      expect(rotated.body.success).toBe(true);
      aliceToken = rotated.body.data.accessToken;

      const replayed = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: aliceRefreshToken })
        .expect(401);
      expect(replayed.body.success).toBe(false);
      expect(replayed.body.error.code).toBe('REFRESH_TOKEN_REUSE_DETECTED');

      const relogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: aliceEmail,
          password: 'NavrixUser2026!',
        })
        .expect(200);
      aliceToken = relogin.body.data.accessToken;

      const googleBob = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({
          idToken: `mock_google_id_token_${runHex}`,
          email: bobEmail,
          name: 'Bob Google Live MySQL',
        })
        .expect(200);
      expect(googleBob.body.data.user.uid).toMatch(/^USR-\d{6}$/);
      expect(googleBob.body.data.user.emailVerified).toBe(true);
      bobToken = googleBob.body.data.accessToken;
    },
    60_000,
  );

  it(
    '2. Enforces strict backend RBAC against live MySQL roles: blocks USER from admin login and all /admin/* endpoints',
    async () => {
      const deniedAdminLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: aliceEmail,
          password: 'NavrixUser2026!',
          requireAdmin: true,
        })
        .expect(403);
      expect(deniedAdminLogin.body.error.code).toBe('ADMIN_ACCESS_DENIED');

      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(403);

      const adminLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@navrix.local',
          password: 'StaffAdmin@123',
          requireAdmin: true,
        })
        .expect(200);
      adminToken = adminLogin.body.data.accessToken;

      await request(app.getHttpServer())
        .get('/api/v1/admin/master/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      const masterLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'masteradmin@navrix.local',
          password: 'MasterAdmin@123',
          requireAdmin: true,
        })
        .expect(200);
      masterToken = masterLogin.body.data.accessToken;
    },
    60_000,
  );

  it(
    '3. Creates BEP-20 USDT deposit in live MySQL with dynamic QR & configured receiving wallet without crediting balance prematurely',
    async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/deposits')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          amount: 250,
          network: 'BNB_SMART_CHAIN',
          planCode: 'NAVRIX-CORE-30D',
        })
        .expect(201);

      const dep = createRes.body.data;
      expect(dep.depositUid).toMatch(/^DEP-\d{8}-\d{6}$/);
      expect(dep.status).toBe('PENDING_PAYMENT');
      expect(dep.receivingAddress).toBe(
        BLOCKCHAIN_DEFAULTS.defaultReceivingAddress,
      );
      expect(dep.paymentInstructions.qrDataUrl).toMatch(
        /^data:image\/png;base64,/,
      );
      expect(dep.paymentInstructions.warning).toContain(
        'BNB Smart Chain (BEP-20)',
      );
      approvedDepositUid = dep.depositUid;

      const walletRes = await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
      expect(Number(walletRes.body.data.totalBalance)).toBe(0);
    },
    60_000,
  );

  it(
    '4. Validates transaction hash, inspects screenshot magic bytes, transitions to 24h UNDER_REVIEW in MySQL, and blocks unauthorized screenshot access',
    async () => {
      const urlAttempt = await request(app.getHttpServer())
        .post(`/api/v1/deposits/${approvedDepositUid}/submit-payment`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .field('transactionHash', `https://bscscan.com/tx/${validDepositTxHash}`)
        .expect(400);
      expect(urlAttempt.body.error.code).toBe('INVALID_TRANSACTION_HASH');

      const spoofedFile = Buffer.from('MZ-fake-executable-payload-not-an-image');
      const spoofAttempt = await request(app.getHttpServer())
        .post(`/api/v1/deposits/${approvedDepositUid}/submit-payment`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .field('transactionHash', validDepositTxHash)
        .attach('screenshot', spoofedFile, {
          filename: 'receipt.png',
          contentType: 'image/png',
        })
        .expect(400);
      expect(spoofAttempt.body.success).toBe(false);

      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/deposits/${approvedDepositUid}/submit-payment`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .field('transactionHash', validDepositTxHash)
        .field('notes', 'Sent 250 USDT from Trust Wallet')
        .attach('screenshot', VALID_1X1_PNG, {
          filename: 'payment-proof.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(submitRes.body.data.status).toBe('UNDER_REVIEW');
      expect(submitRes.body.data.hasScreenshot).toBe(true);
      expect(submitRes.body.data.reviewNotice).toContain('24 hours');
      expect(submitRes.body.data.blockchainVerification.isValid).toBe(true);
      expect(Number(submitRes.body.data.blockchainVerification.actualAmount)).toBe(
        250,
      );

      await request(app.getHttpServer())
        .get(`/api/v1/deposits/${approvedDepositUid}/screenshot`)
        .set('Authorization', `Bearer ${bobToken}`)
        .expect(403);

      const adminImg = await request(app.getHttpServer())
        .get(`/api/v1/deposits/${approvedDepositUid}/screenshot`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(adminImg.headers['content-type']).toContain('image/png');
    },
    60_000,
  );

  it(
    '5. Prevents duplicate transaction hash replay across users in MySQL and blocks approving reverted on-chain transactions',
    async () => {
      const bobDepRes = await request(app.getHttpServer())
        .post('/api/v1/deposits')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ amount: 250 })
        .expect(201);
      rejectedDepositUid = bobDepRes.body.data.depositUid;

      const dupAttempt = await request(app.getHttpServer())
        .post(`/api/v1/deposits/${rejectedDepositUid}/submit-payment`)
        .set('Authorization', `Bearer ${bobToken}`)
        .field('transactionHash', validDepositTxHash)
        .expect(409);
      expect(dupAttempt.body.error.code).toBe('DUPLICATE_TRANSACTION_HASH');

      const bobSubmit = await request(app.getHttpServer())
        .post(`/api/v1/deposits/${rejectedDepositUid}/submit-payment`)
        .set('Authorization', `Bearer ${bobToken}`)
        .field('transactionHash', revertedDepositTxHash)
        .expect(201);
      expect(bobSubmit.body.data.blockchainVerification.isValid).toBe(false);
      expect(bobSubmit.body.data.blockchainVerification.failureCode).toBe(
        'TX_REVERTED',
      );

      const badApprove = await request(app.getHttpServer())
        .post(`/api/v1/admin/deposits/${rejectedDepositUid}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
      expect(badApprove.body.error.code).toBe('BLOCKCHAIN_VERIFICATION_FAILED');

      const rejectRes = await request(app.getHttpServer())
        .post(`/api/v1/admin/deposits/${rejectedDepositUid}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'On-chain transaction reverted (status 0).' })
        .expect(201);
      expect(rejectRes.body.data.status).toBe('REJECTED');
    },
    60_000,
  );

  it(
    '6. Approves valid deposit with MySQL FOR UPDATE lock: re-verifies chain, posts immutable DEPOSIT ledger credit, activates INV- record, and blocks double-approval',
    async () => {
      const approveRes = await request(app.getHttpServer())
        .post(`/api/v1/admin/deposits/${approvedDepositUid}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(approveRes.body.data.deposit.status).toBe('APPROVED');
      expect(approveRes.body.data.ledgerEntry.ledgerUid).toMatch(
        /^LED-\d{8}-\d{6}$/,
      );
      expect(approveRes.body.data.ledgerEntry.transactionType).toBe('DEPOSIT');
      expect(Number(approveRes.body.data.ledgerEntry.balanceBefore)).toBe(0);
      expect(Number(approveRes.body.data.ledgerEntry.balanceAfter)).toBe(250);
      expect(approveRes.body.data.investment.investmentUid).toMatch(
        /^INV-\d{8}-\d{6}$/,
      );
      activeInvestmentUid = approveRes.body.data.investment.investmentUid;

      const doubleApprove = await request(app.getHttpServer())
        .post(`/api/v1/admin/deposits/${approvedDepositUid}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
      expect(doubleApprove.body.error.code).toBe('DEPOSIT_ALREADY_PROCESSED');

      const ledgerCount = await prisma.ledgerEntry.count({
        where: {
          referenceType: 'DEPOSIT',
          referenceId: approvedDepositUid,
        },
      });
      expect(ledgerCount).toBe(1);

      const walletRes = await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
      expect(Number(walletRes.body.data.investedBalance)).toBe(250);
      expect(Number(walletRes.body.data.totalBalance)).toBe(250);
    },
    60_000,
  );

  it(
    '7. Credits configurable interest into separate MySQL INTEREST ledger entries and prevents duplicate period credits',
    async () => {
      const credit1 = await request(app.getHttpServer())
        .post(`/api/v1/admin/investments/${activeInvestmentUid}/interest`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          calculationModel: 'PERCENTAGE',
          rateOrAmount: 5,
          periodKey: '2026-11-CYCLE-1',
          description: 'Monthly 5% vault yield',
        })
        .expect(201);

      expect(Number(credit1.body.data.interestRecord.amount)).toBe(12.5);
      expect(credit1.body.data.ledgerEntry.transactionType).toBe('INTEREST');
      expect(Number(credit1.body.data.ledgerEntry.balanceBefore)).toBe(250);
      expect(Number(credit1.body.data.ledgerEntry.balanceAfter)).toBe(262.5);

      const dupInterest = await request(app.getHttpServer())
        .post(`/api/v1/admin/investments/${activeInvestmentUid}/interest`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          calculationModel: 'PERCENTAGE',
          rateOrAmount: 5,
          periodKey: '2026-11-cycle-1',
        })
        .expect(409);
      expect(dupInterest.body.error.code).toBe('DUPLICATE_INTEREST_PERIOD');

      const credit2 = await request(app.getHttpServer())
        .post(`/api/v1/admin/investments/${activeInvestmentUid}/interest`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          calculationModel: 'FIXED_AMOUNT',
          rateOrAmount: 40,
          periodKey: '2026-11-BONUS',
        })
        .expect(201);
      expect(Number(credit2.body.data.ledgerEntry.balanceAfter)).toBe(302.5);
    },
    60_000,
  );

  it(
    '8. Full Withdrawal Lifecycle in live MySQL: blocks overdraft, locks balance on request, unlocks on rejection, and posts final WITHDRAWAL debit with outbound tx hash on completion',
    async () => {
      const destWallet = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

      const overWithdraw = await request(app.getHttpServer())
        .post('/api/v1/withdrawals')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          amount: 100,
          destinationAddress: destWallet,
        })
        .expect(400);
      expect(overWithdraw.body.error.code).toBe('INSUFFICIENT_AVAILABLE_BALANCE');

      // 1st withdrawal (25 USDT) -> locks 25 USDT (available: 27.50, locked: 25.00)
      const w1Res = await request(app.getHttpServer())
        .post('/api/v1/withdrawals')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          amount: 25,
          destinationAddress: destWallet,
        })
        .expect(201);
      rejectedWithdrawalUid = w1Res.body.data.withdrawalUid;
      expect(rejectedWithdrawalUid).toMatch(/^WDR-\d{8}-\d{6}$/);

      const lockedCheck = await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
      expect(Number(lockedCheck.body.data.availableBalance)).toBe(27.5);
      expect(Number(lockedCheck.body.data.lockedBalance)).toBe(25);

      // Admin rejects WDR-1 -> atomically unlocks 25 USDT back to availableBalance (52.50)
      await request(app.getHttpServer())
        .post(`/api/v1/admin/withdrawals/${rejectedWithdrawalUid}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Destination wallet verification requested by user.' })
        .expect(201);

      const unlockedCheck = await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
      expect(Number(unlockedCheck.body.data.availableBalance)).toBe(52.5);
      expect(Number(unlockedCheck.body.data.lockedBalance)).toBe(0);

      // 2nd withdrawal (30 USDT) -> Approve -> Complete with outbound BSC tx hash
      const w2Res = await request(app.getHttpServer())
        .post('/api/v1/withdrawals')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          amount: 30,
          destinationAddress: destWallet,
        })
        .expect(201);
      completedWithdrawalUid = w2Res.body.data.withdrawalUid;

      await request(app.getHttpServer())
        .post(`/api/v1/admin/withdrawals/${completedWithdrawalUid}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const completeRes = await request(app.getHttpServer())
        .post(`/api/v1/admin/withdrawals/${completedWithdrawalUid}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ transactionHash: outboundWithdrawalTxHash })
        .expect(201);

      expect(completeRes.body.data.withdrawal.status).toBe('COMPLETED');
      expect(completeRes.body.data.ledgerEntry.transactionType).toBe(
        'WITHDRAWAL',
      );
      expect(completeRes.body.data.ledgerEntry.direction).toBe('DEBIT');
      expect(Number(completeRes.body.data.ledgerEntry.balanceBefore)).toBe(
        302.5,
      );
      expect(Number(completeRes.body.data.ledgerEntry.balanceAfter)).toBe(
        272.5,
      );

      // Final Alice wallet check: available = 22.50, locked = 0.00, invested = 250.00, total = 272.50
      const finalWallet = await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
      expect(Number(finalWallet.body.data.availableBalance)).toBe(22.5);
      expect(Number(finalWallet.body.data.lockedBalance)).toBe(0);
      expect(Number(finalWallet.body.data.investedBalance)).toBe(250);
      expect(Number(finalWallet.body.data.totalBalance)).toBe(272.5);
    },
    60_000,
  );

  it(
    '9. Verifies Master Admin solvency reconciliation (0.00000000 discrepancy across all MySQL wallets & ledger entries), emergency circuit breakers, and immutable audit trail',
    async () => {
      const masterOverview = await request(app.getHttpServer())
        .get('/api/v1/admin/master/overview')
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(200);

      const rec = masterOverview.body.data.reconciliation;
      expect(rec.isReconciled).toBe(true);
      expect(rec.discrepancy).toBe('0.00000000');

      await request(app.getHttpServer())
        .post('/api/v1/admin/master/circuit-breaker')
        .set('Authorization', `Bearer ${masterToken}`)
        .send({ key: 'DEPOSITS_ENABLED', enabled: false })
        .expect(201);

      const pausedDep = await request(app.getHttpServer())
        .post('/api/v1/deposits')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ amount: 50 })
        .expect(503);
      expect(pausedDep.body.error.code).toBe('DEPOSITS_TEMPORARILY_PAUSED');

      await request(app.getHttpServer())
        .post('/api/v1/admin/master/circuit-breaker')
        .set('Authorization', `Bearer ${masterToken}`)
        .send({ key: 'DEPOSITS_ENABLED', enabled: true })
        .expect(201);

      const audits = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs?limit=100')
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(200);

      const actions = audits.body.data.items.map(
        (a: { action: string }) => a.action,
      );
      expect(actions).toContain('ADMIN_LOGIN');
      expect(actions).toContain('DEPOSIT_VERIFIED');
      expect(actions).toContain('DEPOSIT_APPROVED');
      expect(actions).toContain('DEPOSIT_REJECTED');
      expect(actions).toContain('INTEREST_CREATED');
      expect(actions).toContain('WITHDRAWAL_REJECTED');
      expect(actions).toContain('WITHDRAWAL_APPROVED');
      expect(actions).toContain('WITHDRAWAL_COMPLETED');
      expect(actions).toContain('EMERGENCY_PAUSE_TOGGLED');
    },
    60_000,
  );
});
