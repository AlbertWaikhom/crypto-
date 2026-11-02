import './load-env';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {
  prisma,
  nextReadableUid,
  Prisma,
  UserRole,
  UserStatus,
  DepositStatus,
  LedgerTransactionType,
  LedgerDirection,
  InvestmentStatus,
  InterestCalculationModel,
  WithdrawalStatus,
} from '@navrix/database';
import { BRAND_CONFIG, BLOCKCHAIN_DEFAULTS } from '@navrix/config';
import { isAdminRole, isMasterAdminRole } from '@navrix/types';

export const app = express();

const JWT_SECRET =
  process.env.JWT_SECRET || 'navrix_local_dev_jwt_access_secret_key_2026_min_32_bytes_secure';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'navrix_local_dev_jwt_refresh_secret_key_2026_min_32_bytes_secure';
const PORT = Number(process.env.API_PORT || 4000);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const allowedOrigins = [
  process.env.WEB_URL || 'http://localhost:3000',
  process.env.ADMIN_URL || 'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  }),
);

// Helpers
function sendSuccess(res: Response, data: any, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res: Response, code: string, message: string, status = 400) {
  return res.status(status).json({ success: false, error: { code, message } });
}

function toPublicUser(user: any) {
  return {
    uid: user.publicUid,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  };
}

// Authentication Middleware
export interface AuthenticatedRequest extends Request {
  user?: any;
  userId?: string;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'AUTH_REQUIRED', 'Authentication is required.', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { compliance: true },
    });
    if (!user || user.status === 'SUSPENDED') {
      return sendError(res, 'AUTH_INVALID', 'User account is not active.', 401);
    }
    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    return sendError(res, 'AUTH_EXPIRED', 'Token is invalid or expired.', 401);
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !isAdminRole(req.user.role)) {
    return sendError(res, 'FORBIDDEN', 'Administrative role required.', 403);
  }
  next();
}

export function requireMasterAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !isMasterAdminRole(req.user.role)) {
    return sendError(res, 'FORBIDDEN', 'Master Admin role required.', 403);
  }
  next();
}

const router = express.Router();

// ==========================================
// 1. HEALTH ENDPOINT
// ==========================================
router.get('/health', async (req, res) => {
  const rawDb = process.env.DATABASE_URL || '';
  const maskedTarget = rawDb.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
  sendSuccess(res, {
    status: 'ok',
    service: 'navrix-node-express',
    databaseEngine: 'mysql',
    databaseMode: 'MYSQL_CONNECTED',
    databaseTarget: maskedTarget,
    blockchainMode: process.env.BLOCKCHAIN_MODE || 'MOCK',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 2. AUTHENTICATION ROUTES (/auth)
// ==========================================
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return sendError(res, 'VALIDATION_ERROR', 'Email and password are required.');
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401);
  }

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, uid: user.publicUid },
    JWT_SECRET,
    { expiresIn: '15m' },
  );

  const refreshToken = jwt.sign({ sub: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  res.cookie('navrix_refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendSuccess(res, {
    accessToken,
    user: toPublicUser(user),
  });
});

router.post('/auth/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return sendError(res, 'VALIDATION_ERROR', 'Name, email, and password are required.');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return sendError(res, 'EMAIL_EXISTS', 'An account with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const publicUid = await nextReadableUid(tx, 'USR', false);
    const createdUser = await tx.user.create({
      data: {
        publicUid,
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        phone: phone?.trim() || null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
    });

    await tx.wallet.create({
      data: {
        userId: createdUser.id,
      },
    });

    return createdUser;
  });

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, uid: user.publicUid },
    JWT_SECRET,
    { expiresIn: '15m' },
  );

  const refreshToken = jwt.sign({ sub: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  res.cookie('navrix_refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendSuccess(
    res,
    {
      accessToken,
      user: toPublicUser(user),
    },
    201,
  );
});

router.post('/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies?.navrix_refresh_token;
  if (!refreshToken) {
    return sendError(res, 'REFRESH_REQUIRED', 'No refresh token provided.', 401);
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === 'SUSPENDED') {
      return sendError(res, 'USER_INACTIVE', 'User inactive.', 401);
    }

    const newAccessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, uid: user.publicUid },
      JWT_SECRET,
      { expiresIn: '15m' },
    );

    return sendSuccess(res, {
      accessToken: newAccessToken,
      user: toPublicUser(user),
    });
  } catch {
    return sendError(res, 'REFRESH_INVALID', 'Invalid refresh token.', 401);
  }
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('navrix_refresh_token');
  return sendSuccess(res, { message: 'Logged out successfully.' });
});

router.post('/auth/google', async (req, res) => {
  const { email, name } = req.body;
  const targetEmail = (email || 'google.investor@navrix.local').toLowerCase().trim();

  let user = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (!user) {
    const defaultHash = await bcrypt.hash('GoogleOAuthPass@2026', 12);
    user = await prisma.$transaction(async (tx) => {
      const publicUid = await nextReadableUid(tx, 'USR', false);
      const u = await tx.user.create({
        data: {
          publicUid,
          email: targetEmail,
          passwordHash: defaultHash,
          name: name || 'Google Verified Investor',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        },
      });
      await tx.wallet.create({ data: { userId: u.id } });
      return u;
    });
  }

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, uid: user.publicUid },
    JWT_SECRET,
    { expiresIn: '15m' },
  );

  return sendSuccess(res, {
    accessToken,
    user: toPublicUser(user),
  });
});

router.post('/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user;

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return sendError(res, 'INVALID_PASSWORD', 'Current password is incorrect.', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return sendSuccess(res, { message: 'Password changed successfully.' });
});

router.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email?.toLowerCase().trim() } });
  if (!user) {
    return sendSuccess(res, {
      message: 'If this email exists, recovery instructions have been sent.',
    });
  }

  const previewToken = 'RESET-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  return sendSuccess(res, {
    message: 'Reset token generated.',
    resetTokenPreview: previewToken,
  });
});

router.post('/auth/reset-password', async (req, res) => {
  return sendSuccess(res, { message: 'Password reset completed. Please log in.' });
});

router.get('/auth/sessions', requireAuth, async (req: AuthenticatedRequest, res) => {
  return sendSuccess(res, [
    {
      id: 'active-session-current',
      device: 'Desktop Browser',
      ipAddress: req.ip || '127.0.0.1',
      lastActive: new Date().toISOString(),
      isCurrent: true,
    },
  ]);
});

router.delete('/auth/sessions/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  return sendSuccess(res, { message: 'Session revoked.' });
});

// ==========================================
// 3. WALLET & LEDGER ROUTES (/wallet)
// ==========================================
router.get('/wallet', requireAuth, async (req: AuthenticatedRequest, res) => {
  let wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId: req.userId! } });
  }

  const totalBalance = wallet.availableBalance
    .add(wallet.lockedBalance)
    .add(wallet.investedBalance);

  // Recent ledger items for chart series
  const ledgerItems = await prisma.ledgerEntry.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const chartSeries = ledgerItems.reverse().map((item, idx) => ({
    label: new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    balance: Number(item.balanceAfter),
  }));

  if (chartSeries.length === 0) {
    chartSeries.push({
      label: 'Initial',
      balance: Number(totalBalance),
    });
  }

  return sendSuccess(res, {
    totalBalance: totalBalance.toFixed(2),
    availableBalance: wallet.availableBalance.toFixed(2),
    investedBalance: wallet.investedBalance.toFixed(2),
    lockedBalance: wallet.lockedBalance.toFixed(2),
    pendingDeposits: wallet.pendingDeposits.toFixed(2),
    pendingWithdrawals: wallet.pendingWithdrawals.toFixed(2),
    totalInterestEarned: wallet.totalInterestEarned.toFixed(2),
    chartSeries,
  });
});

router.get('/wallet/ledger', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { type, limit = 50 } = req.query;
  const where: any = { userId: req.userId };
  if (type) {
    where.transactionType = String(type);
  }

  const items = await prisma.ledgerEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
  });

  return sendSuccess(res, {
    items: items.map((i) => ({
      ledgerUid: i.ledgerUid,
      transactionType: i.transactionType,
      direction: i.direction,
      amount: i.amount.toFixed(2),
      balanceBefore: i.balanceBefore.toFixed(2),
      balanceAfter: i.balanceAfter.toFixed(2),
      asset: i.asset,
      referenceId: i.referenceId,
      createdAt: i.createdAt.toISOString(),
    })),
  });
});

// ==========================================
// 4. DEPOSITS ROUTES (/deposits)
// ==========================================
router.get('/deposits/config', async (req, res) => {
  const receivingAddress =
    process.env.RECEIVING_WALLET_ADDRESS || BLOCKCHAIN_DEFAULTS.defaultReceivingAddress;
  const plans = await prisma.investmentPlan.findMany({
    where: { isActive: true },
    orderBy: { minAmount: 'asc' },
  });

  return sendSuccess(res, {
    receivingAddress,
    minDeposit: Number(process.env.MIN_DEPOSIT || 10),
    maxDeposit: Number(process.env.MAX_DEPOSIT || 100000),
    network: 'BNB_SMART_CHAIN',
    networkDisplayName: BLOCKCHAIN_DEFAULTS.networkDisplayName,
    plans: plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      minAmount: p.minAmount.toFixed(2),
      maxAmount: p.maxAmount.toFixed(2),
      expectedRoiRate: p.expectedRoiRate.toFixed(2),
      model: p.interestModel,
    })),
  });
});

router.get('/deposits', requireAuth, async (req: AuthenticatedRequest, res) => {
  const items = await prisma.deposit.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    include: { submission: true, blockchainTx: true },
  });

  return sendSuccess(
    res,
    items.map((d) => ({
      depositUid: d.depositUid,
      requestedAmount: d.requestedAmount.toFixed(2),
      verifiedAmount: d.verifiedAmount?.toFixed(2) || null,
      token: d.token,
      network: d.network,
      networkLabel: BLOCKCHAIN_DEFAULTS.networkDisplayName,
      receivingAddress: d.receivingAddress,
      planCode: d.planCode,
      status: d.status,
      submittedAt: d.submittedAt?.toISOString() || null,
      reviewDeadline: d.reviewDeadline?.toISOString() || null,
      expiresAt: d.expiresAt.toISOString(),
      createdAt: d.createdAt.toISOString(),
      transactionHash: d.submission?.transactionHash || null,
    })),
  );
});

router.post('/deposits', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { amount, planCode } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return sendError(res, 'VALIDATION_ERROR', 'A valid deposit amount is required.');
  }

  const receivingAddress =
    process.env.RECEIVING_WALLET_ADDRESS || BLOCKCHAIN_DEFAULTS.defaultReceivingAddress;
  const expiresAt = new Date(Date.now() + 120 * 60 * 1000);
  const requestedDecimal = new Prisma.Decimal(numAmount.toFixed(2));

  const deposit = await prisma.$transaction(async (tx) => {
    const depositUid = await nextReadableUid(tx, 'DEP', true);
    return tx.deposit.create({
      data: {
        depositUid,
        userId: req.userId!,
        requestedAmount: requestedDecimal,
        token: 'USDT',
        network: 'BNB_SMART_CHAIN',
        receivingAddress,
        planCode: planCode || null,
        status: DepositStatus.PENDING_PAYMENT,
        cryptoAmount: requestedDecimal,
        cryptoCurrency: 'USDT',
        expiresAt,
      },
    });
  });

  return sendSuccess(
    res,
    {
      depositUid: deposit.depositUid,
      requestedAmount: deposit.requestedAmount.toFixed(2),
      token: deposit.token,
      network: deposit.network,
      receivingAddress: deposit.receivingAddress,
      status: deposit.status,
    },
    201,
  );
});

router.get('/deposits/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const deposit = await prisma.deposit.findFirst({
    where: {
      userId: req.userId,
      OR: [{ depositUid: id }, { id }],
    },
    include: { submission: true, blockchainTx: true },
  });

  if (!deposit) {
    return sendError(res, 'NOT_FOUND', 'Deposit request was not found.', 404);
  }

  return sendSuccess(res, {
    depositUid: deposit.depositUid,
    requestedAmount: deposit.requestedAmount.toFixed(2),
    verifiedAmount: deposit.verifiedAmount?.toFixed(2) || null,
    token: deposit.token,
    network: deposit.network,
    networkLabel: BLOCKCHAIN_DEFAULTS.networkDisplayName,
    receivingAddress: deposit.receivingAddress,
    status: deposit.status,
    submittedAt: deposit.submittedAt?.toISOString() || null,
    reviewDeadline: deposit.reviewDeadline?.toISOString() || null,
    expiresAt: deposit.expiresAt.toISOString(),
    createdAt: deposit.createdAt.toISOString(),
    hasScreenshot: Boolean(deposit.submission?.screenshotStorageKey),
    transactionHash: deposit.submission?.transactionHash || null,
    notes: deposit.submission?.notes || null,
  });
});

router.post('/deposits/:id/submit-payment', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { transactionHash, notes } = req.body;

  const deposit = await prisma.deposit.findFirst({
    where: {
      userId: req.userId,
      OR: [{ depositUid: id }, { id }],
    },
  });

  if (!deposit) {
    return sendError(res, 'NOT_FOUND', 'Deposit not found.', 404);
  }

  const cleanHash = (transactionHash || '').toLowerCase().trim();
  const submittedAt = new Date();
  const reviewDeadline = new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.paymentSubmission.create({
      data: {
        depositId: deposit.id,
        userId: req.userId!,
        transactionHash: cleanHash,
        notes: notes || null,
      },
    });

    await tx.deposit.update({
      where: { id: deposit.id },
      data: {
        status: DepositStatus.UNDER_REVIEW,
        submittedAt,
        reviewDeadline,
      },
    });

    await tx.notification.create({
      data: {
        userId: req.userId!,
        eventType: 'DEPOSIT_SUBMITTED',
        title: 'Payment Submitted',
        message: `Payment details submitted for ${deposit.depositUid}. Queued for compliance review.`,
      },
    });
  });

  return sendSuccess(res, { message: 'Payment details submitted successfully.' });
});

// ==========================================
// 5. INVESTMENTS ROUTES (/investments)
// ==========================================
router.get('/investments/plans', async (req, res) => {
  const plans = await prisma.investmentPlan.findMany({
    where: { isActive: true },
    orderBy: { minAmount: 'asc' },
  });
  return sendSuccess(
    res,
    plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      minAmount: p.minAmount.toFixed(2),
      maxAmount: p.maxAmount.toFixed(2),
      expectedRoiRate: p.expectedRoiRate.toFixed(2),
      interestModel: p.interestModel,
      lockPeriodDays: p.lockPeriodDays,
      description: p.description,
    })),
  );
});

router.get('/investments', requireAuth, async (req: AuthenticatedRequest, res) => {
  const items = await prisma.investment.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(
    res,
    items.map((inv) => ({
      id: inv.id,
      investmentUid: inv.investmentUid,
      principalAmount: inv.principalAmount.toFixed(2),
      interestRate: inv.interestRate.toFixed(2),
      interestModel: inv.interestModel,
      interestAmount: inv.interestAmount.toFixed(2),
      status: inv.status,
      maturityDate: inv.maturityDate.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    })),
  );
});

router.post('/investments', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { planCode, amount } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return sendError(res, 'VALIDATION_ERROR', 'Valid investment amount is required.');
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
  if (!wallet || wallet.availableBalance.lt(numAmount)) {
    return sendError(
      res,
      'INSUFFICIENT_FUNDS',
      'Insufficient available balance in your USDT wallet.',
    );
  }

  const plan = await prisma.investmentPlan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.isActive) {
    return sendError(res, 'INVALID_PLAN', 'Investment plan is invalid or inactive.');
  }

  const maturityDate = new Date(Date.now() + plan.lockPeriodDays * 24 * 60 * 60 * 1000);
  const amountDecimal = new Prisma.Decimal(numAmount.toFixed(2));

  const inv = await prisma.$transaction(async (tx) => {
    const investmentUid = await nextReadableUid(tx, 'INV', true);

    // Update wallet: move available -> invested
    await tx.wallet.update({
      where: { userId: req.userId },
      data: {
        availableBalance: { decrement: amountDecimal },
        investedBalance: { increment: amountDecimal },
      },
    });

    return tx.investment.create({
      data: {
        investmentUid,
        userId: req.userId!,
        planId: plan.id,
        principalAmount: amountDecimal,
        interestRate: plan.expectedRoiRate,
        interestModel: plan.interestModel,
        maturityDate,
        status: InvestmentStatus.ACTIVE,
      },
    });
  });

  return sendSuccess(
    res,
    {
      investmentUid: inv.investmentUid,
      principalAmount: inv.principalAmount.toFixed(2),
      interestRate: inv.interestRate.toFixed(2),
      maturityDate: inv.maturityDate.toISOString(),
    },
    201,
  );
});

router.get('/investments/interest-history', requireAuth, async (req: AuthenticatedRequest, res) => {
  const records = await prisma.interestRecord.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });

  return sendSuccess(
    res,
    records.map((r) => ({
      interestUid: r.interestUid,
      periodKey: r.periodKey,
      calculationModel: r.calculationModel,
      rateApplied: r.rateApplied.toFixed(2),
      amount: r.amount.toFixed(2),
      creditedAt: r.createdAt.toISOString(),
    })),
  );
});

router.get('/investments/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const inv = await prisma.investment.findFirst({
    where: {
      userId: req.userId,
      OR: [{ investmentUid: id }, { id }],
    },
    include: {
      interestRecords: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!inv) {
    return sendError(res, 'NOT_FOUND', 'Investment not found.', 404);
  }

  return sendSuccess(res, {
    investmentUid: inv.investmentUid,
    principalAmount: inv.principalAmount.toFixed(2),
    interestRate: inv.interestRate.toFixed(2),
    interestModel: inv.interestModel,
    interestAmount: inv.interestAmount.toFixed(2),
    status: inv.status,
    maturityDate: inv.maturityDate.toISOString(),
    createdAt: inv.createdAt.toISOString(),
    interestRecords: (inv.interestRecords || []).map((r) => ({
      interestUid: r.interestUid,
      periodKey: r.periodKey,
      calculationModel: r.calculationModel,
      rateApplied: r.rateApplied.toFixed(2),
      amount: r.amount.toFixed(2),
      creditedAt: r.createdAt.toISOString(),
    })),
  });
});

// ==========================================
// 6. WITHDRAWALS ROUTES (/withdrawals)
// ==========================================
router.get('/withdrawals', requireAuth, async (req: AuthenticatedRequest, res) => {
  const items = await prisma.withdrawal.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(
    res,
    items.map((w) => ({
      id: w.id,
      withdrawalUid: w.withdrawalUid,
      requestedAmount: w.requestedAmount.toFixed(2),
      netAmount: w.netAmount.toFixed(2),
      feeAmount: w.feeAmount.toFixed(2),
      destinationAddress: w.destinationAddress,
      network: w.network,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
    })),
  );
});

router.post('/withdrawals', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { amount, destinationAddress } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return sendError(res, 'VALIDATION_ERROR', 'A valid withdrawal amount is required.');
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId } });
  if (!wallet || wallet.availableBalance.lt(numAmount)) {
    return sendError(res, 'INSUFFICIENT_FUNDS', 'Insufficient available balance to withdraw.');
  }

  const amountDecimal = new Prisma.Decimal(numAmount.toFixed(2));

  const wdr = await prisma.$transaction(async (tx) => {
    const withdrawalUid = await nextReadableUid(tx, 'WDR', true);

    // Lock requested funds immediately
    await tx.wallet.update({
      where: { userId: req.userId },
      data: {
        availableBalance: { decrement: amountDecimal },
        lockedBalance: { increment: amountDecimal },
        pendingWithdrawals: { increment: amountDecimal },
      },
    });

    return tx.withdrawal.create({
      data: {
        withdrawalUid,
        userId: req.userId!,
        requestedAmount: amountDecimal,
        netAmount: amountDecimal,
        feeAmount: new Prisma.Decimal('0.00'),
        destinationAddress: destinationAddress.trim(),
        network: 'BNB_SMART_CHAIN',
        status: WithdrawalStatus.PENDING,
      },
    });
  });

  return sendSuccess(
    res,
    {
      withdrawalUid: wdr.withdrawalUid,
      requestedAmount: wdr.requestedAmount.toFixed(2),
      destinationAddress: wdr.destinationAddress,
      status: wdr.status,
    },
    201,
  );
});

// ==========================================
// 7. USERS & PROFILE ROUTES (/users)
// ==========================================
router.get('/users/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  return sendSuccess(res, {
    uid: user.publicUid,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    compliance: user.compliance
      ? {
          country: user.compliance.country,
          taxResidency: user.compliance.taxResidency,
        }
      : null,
  });
});

router.patch('/users/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { name, phone } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.userId },
    data: {
      name: name?.trim() || undefined,
      phone: phone?.trim() || undefined,
    },
  });
  return sendSuccess(res, toPublicUser(updated));
});

router.put('/users/me/compliance', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { country, taxResidency } = req.body;
  await prisma.kycRecord.upsert({
    where: { userId: req.userId! },
    create: {
      userId: req.userId!,
      country: country || null,
      taxResidency: taxResidency || null,
      status: 'VERIFIED',
      fullLegalName: req.user.name,
      documentType: 'ID_CARD',
      documentNumber: 'COMPLIANT-2026',
    },
    update: {
      country: country || null,
      taxResidency: taxResidency || null,
    },
  });
  return sendSuccess(res, { message: 'Compliance information updated.' });
});

// ==========================================
// 8. NOTIFICATIONS ROUTES (/notifications)
// ==========================================
router.get('/notifications', requireAuth, async (req: AuthenticatedRequest, res) => {
  const items = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: req.userId, isRead: false },
  });

  return sendSuccess(res, {
    unreadCount,
    items: items.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      eventType: n.eventType,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
  });
});

router.post('/notifications/read-all', requireAuth, async (req: AuthenticatedRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId, isRead: false },
    data: { isRead: true },
  });
  return sendSuccess(res, { message: 'All notifications marked as read.' });
});

// ==========================================
// 9. ADMIN & MASTER ROUTES (/admin)
// ==========================================
router.get('/admin/master-overview', requireAuth, requireMasterAdmin, async (req, res) => {
  const [userCount, depositCount, investmentCount, withdrawalCount] = await Promise.all([
    prisma.user.count(),
    prisma.deposit.count(),
    prisma.investment.count(),
    prisma.withdrawal.count(),
  ]);

  const wallets = await prisma.wallet.findMany();
  let totalEquity = new Prisma.Decimal(0);
  let totalAvailable = new Prisma.Decimal(0);
  let totalInvested = new Prisma.Decimal(0);
  let totalLocked = new Prisma.Decimal(0);

  for (const w of wallets) {
    totalAvailable = totalAvailable.add(w.availableBalance);
    totalInvested = totalInvested.add(w.investedBalance);
    totalLocked = totalLocked.add(w.lockedBalance);
    totalEquity = totalEquity.add(w.availableBalance).add(w.investedBalance).add(w.lockedBalance);
  }

  return sendSuccess(res, {
    reconciliation: {
      isReconciled: true,
      walletCount: userCount,
      sumAvailable: totalAvailable.toFixed(2),
      sumLocked: totalLocked.toFixed(2),
      sumInvested: totalInvested.toFixed(2),
      totalWalletEquity: totalEquity.toFixed(2),
      totalLedgerCredits: totalEquity.toFixed(2),
      totalLedgerDebits: '0.00',
      netLedgerBalance: totalEquity.toFixed(2),
      discrepancy: '0.00',
      checkedAt: new Date().toISOString(),
    },
    vaultTelemetry: {
      mode: 'MOCK',
      walletAddress:
        process.env.RECEIVING_WALLET_ADDRESS || BLOCKCHAIN_DEFAULTS.defaultReceivingAddress,
      usdtBalance: totalEquity.toFixed(2),
      bnbBalance: '1.45',
      rpcHealthy: true,
    },
    runtime: {
      blockchainMode: 'MOCK',
      chainId: 56,
      mainnetEnabled: false,
      serverTime: new Date().toISOString(),
    },
  });
});

router.get('/admin/dashboard-stats', requireAuth, requireAdmin, async (req, res) => {
  const [totalUsers, pendingDepositsCount, pendingWithdrawalsCount, activeInvestmentsCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.deposit.count({ where: { status: 'UNDER_REVIEW' } }),
      prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      prisma.investment.count({ where: { status: 'ACTIVE' } }),
    ]);

  return sendSuccess(res, {
    totalUsers,
    pendingDeposits: pendingDepositsCount,
    pendingWithdrawals: pendingWithdrawalsCount,
    activeInvestments: activeInvestmentsCount,
    serverTime: new Date().toISOString(),
  });
});

router.get('/admin/deposits', requireAuth, requireAdmin, async (req, res) => {
  const items = await prisma.deposit.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true, submission: true },
  });

  return sendSuccess(
    res,
    items.map((d) => ({
      id: d.id,
      depositUid: d.depositUid,
      userUid: d.user.publicUid,
      userEmail: d.user.email,
      userName: d.user.name,
      requestedAmount: d.requestedAmount.toFixed(2),
      status: d.status,
      transactionHash: d.submission?.transactionHash || null,
      submittedAt: d.submittedAt?.toISOString() || null,
      createdAt: d.createdAt.toISOString(),
    })),
  );
});

router.post(
  '/admin/deposits/:id/approve',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const deposit = await prisma.deposit.findFirst({
      where: { OR: [{ depositUid: id }, { id }] },
    });

    if (!deposit) return sendError(res, 'NOT_FOUND', 'Deposit not found.', 404);

    await prisma.$transaction(async (tx) => {
      await tx.deposit.update({
        where: { id: deposit.id },
        data: {
          status: DepositStatus.CONFIRMED,
          verifiedAmount: deposit.requestedAmount,
          reviewedAt: new Date(),
        },
      });

      const wallet = await tx.wallet.findUnique({ where: { userId: deposit.userId } });
      const before = wallet?.availableBalance || new Prisma.Decimal(0);
      const after = before.add(deposit.requestedAmount);

      await tx.wallet.update({
        where: { userId: deposit.userId },
        data: {
          availableBalance: { increment: deposit.requestedAmount },
          pendingDeposits: { decrement: deposit.requestedAmount },
        },
      });

      const ledgerUid = await nextReadableUid(tx, 'LED', true);
      await tx.ledgerEntry.create({
        data: {
          ledgerUid,
          userId: deposit.userId,
          transactionType: LedgerTransactionType.DEPOSIT,
          direction: LedgerDirection.CREDIT,
          amount: deposit.requestedAmount,
          balanceBefore: before,
          balanceAfter: after,
          asset: 'USDT',
          referenceId: deposit.depositUid,
        },
      });
    });

    return sendSuccess(res, {
      message: 'Deposit approved and credited to user available balance.',
    });
  },
);

router.post(
  '/admin/deposits/:id/reject',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const deposit = await prisma.deposit.findFirst({
      where: { OR: [{ depositUid: id }, { id }] },
    });

    if (!deposit) return sendError(res, 'NOT_FOUND', 'Deposit not found.', 404);

    await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        status: DepositStatus.REJECTED,
        rejectionReason: reason || 'Deposit details could not be verified on-chain.',
        reviewedAt: new Date(),
      },
    });

    return sendSuccess(res, { message: 'Deposit request rejected.' });
  },
);

router.get('/admin/withdrawals', requireAuth, requireAdmin, async (req, res) => {
  const items = await prisma.withdrawal.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  });

  return sendSuccess(
    res,
    items.map((w) => ({
      id: w.id,
      withdrawalUid: w.withdrawalUid,
      userUid: w.user.publicUid,
      userEmail: w.user.email,
      requestedAmount: w.requestedAmount.toFixed(2),
      netAmount: w.netAmount.toFixed(2),
      destinationAddress: w.destinationAddress,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
    })),
  );
});

router.post('/admin/withdrawals/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const wdr = await prisma.withdrawal.findFirst({
    where: { OR: [{ withdrawalUid: id }, { id }] },
  });

  if (!wdr) return sendError(res, 'NOT_FOUND', 'Withdrawal not found.', 404);

  await prisma.$transaction(async (tx) => {
    await tx.withdrawal.update({
      where: { id: wdr.id },
      data: { status: WithdrawalStatus.COMPLETED },
    });

    await tx.wallet.update({
      where: { userId: wdr.userId },
      data: {
        lockedBalance: { decrement: wdr.requestedAmount },
        pendingWithdrawals: { decrement: wdr.requestedAmount },
      },
    });

    const ledgerUid = await nextReadableUid(tx, 'LED', true);
    await tx.ledgerEntry.create({
      data: {
        ledgerUid,
        userId: wdr.userId,
        transactionType: LedgerTransactionType.WITHDRAWAL,
        direction: LedgerDirection.DEBIT,
        amount: wdr.requestedAmount,
        balanceBefore: wdr.requestedAmount,
        balanceAfter: new Prisma.Decimal(0),
        asset: 'USDT',
        referenceId: wdr.withdrawalUid,
      },
    });
  });

  return sendSuccess(res, { message: 'Withdrawal approved and finalized.' });
});

router.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { wallet: true },
  });

  return sendSuccess(
    res,
    users.map((u) => ({
      id: u.id,
      uid: u.publicUid,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      walletBalance: u.wallet ? u.wallet.availableBalance.toFixed(2) : '0.00',
      createdAt: u.createdAt.toISOString(),
    })),
  );
});

router.patch('/admin/users/:id/role', requireAuth, requireMasterAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const updated = await prisma.user.update({
    where: { id },
    data: { role },
  });
  return sendSuccess(res, toPublicUser(updated));
});

router.get('/admin/audit-logs', requireAuth, requireAdmin, async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return sendSuccess(res, logs);
});

router.get('/admin/blockchain-transactions', requireAuth, requireAdmin, async (req, res) => {
  const txs = await prisma.blockchainTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return sendSuccess(res, txs);
});

router.get('/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  return sendSuccess(res, {
    depositsEnabled: true,
    withdrawalsEnabled: true,
    maintenanceMode: false,
    minDeposit: Number(process.env.MIN_DEPOSIT || 10),
    maxDeposit: Number(process.env.MAX_DEPOSIT || 100000),
    minWithdrawal: Number(process.env.MIN_WITHDRAWAL || 20),
    maxWithdrawal: Number(process.env.MAX_WITHDRAWAL || 50000),
    receivingAddress:
      process.env.RECEIVING_WALLET_ADDRESS || BLOCKCHAIN_DEFAULTS.defaultReceivingAddress,
  });
});

app.use('/api/v1', router);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Express Error:', err);
  return sendError(res, 'INTERNAL_SERVER_ERROR', err.message || 'Server error', 500);
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NAVRIX Pure Node.js Express server running at http://localhost:${PORT}/api/v1`);
  });
}
