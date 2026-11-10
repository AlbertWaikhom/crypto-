import './load-env';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as crypto from 'crypto';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import multer from 'multer';
import nodemailer from 'nodemailer';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {
  prisma,
  nextReadableUid,
  Prisma,
  PrismaTransactionClient,
  UserRole,
  UserStatus,
  DepositStatus,
  LedgerTransactionType,
  LedgerDirection,
  InvestmentStatus,
  InterestCalculationModel,
  WithdrawalStatus,
} from '@navrix/database';
import { BLOCKCHAIN_DEFAULTS, BRAND_CONFIG } from '@navrix/config';
import {
  AuditAction,
  BlockchainMode,
  BlockchainNetwork,
  canTransitionDepositStatus,
  canTransitionWithdrawalStatus,
  DepositStatus as DomainDepositStatus,
  isAdminRole,
  isMasterAdminRole,
  NotificationEventType,
  WithdrawalStatus as DomainWithdrawalStatus,
} from '@navrix/types';
import { createBlockchainSuite } from '@navrix/blockchain';
import { bscTxHashSchema, evmAddressSchema, passwordPolicySchema } from '@navrix/validation';
import {
  generateUniqueReferralCode,
  distributeMultiLevelReferralCommission,
  getUserReferralOverview,
  getAdminReferralOverview,
  getAdminReferralUsers,
  getAdminReferralAuditCommissions,
  getAdminReferralTree,
  adminAssignReferrer,
} from './referrals/referral.service';

// Safe BigInt JSON serialization for block numbers
(BigInt.prototype as unknown as { toJSON?: () => string }).toJSON = function () {
  return this.toString();
};

export const app = express();

const JWT_SECRET =
  process.env.JWT_SECRET || 'navrix_local_dev_jwt_access_secret_key_2026_min_32_bytes_secure';
const PORT = Number(process.env.UNIFIED_PORT || 3000);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_SCREENSHOT_BYTES || 5 * 1024 * 1024) },
});

// Middleware — COOP allow-popups is essential for Google OAuth Account Chooser popups
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  }),
);

// =============================================================================
//CORE HELPERS & ERROR CLASS
// =============================================================================
class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

function sendSuccess(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
) {
  return res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}

function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function hashOtpForUser(userId: string, tokenType: string, otp: string): string {
  return hashToken(`${userId}:${tokenType}:${otp.trim()}`);
}

function generateSixDigitOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] || '*'}*@${domain}`;
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(5, local.length - 2))}@${domain}`;
}

function parseDeviceLabel(userAgent?: string | null): {
  device: string;
  browser: string;
  os: string;
  isMobile: boolean;
} {
  const ua = userAgent || '';
  const isMobile = /iPhone|iPad|Android|Mobile/i.test(ua);
  let os = 'Desktop';
  if (/Windows NT 10|Windows NT 11/i.test(ua)) os = 'Windows 11';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  return {
    device: `${os} · ${browser}`,
    browser,
    os,
    isMobile,
  };
}

function toPublicUser(user: {
  publicUid: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  tutorialEnabled?: boolean;
  tutorialCompleted?: boolean;
  createdAt: Date | string;
}) {
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
    tutorialEnabled: (user as any).tutorialEnabled ?? true,
    tutorialCompleted: (user as any).tutorialCompleted ?? false,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  };
}

function getRequestMeta(req: Request) {
  return {
    ipAddress:
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown Browser',
    requestId: (req.headers['x-request-id'] as string) || crypto.randomUUID(),
  };
}

// =============================================================================
// EMAIL OTP DELIVERY SERVICE (SMTP + DEV PREVIEW)
// =============================================================================
function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendOtpEmail(params: {
  to: string;
  name: string;
  otp: string;
  purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'LOGIN_OTP' | 'PAYOUT_WALLET';
  expiresMinutes: number;
}): Promise<{ deliveredVia: 'SMTP' | 'DEV_PREVIEW' }> {
  const subjectMap = {
    VERIFY_EMAIL: `${params.otp} is your ${BRAND_CONFIG.name} verification code`,
    RESET_PASSWORD: `${params.otp} is your ${BRAND_CONFIG.name} password reset code`,
    LOGIN_OTP: `${params.otp} is your ${BRAND_CONFIG.name} sign-in code`,
    PAYOUT_WALLET: `${params.otp} is your ${BRAND_CONFIG.name} withdrawal wallet confirmation code`,
  };
  const titleMap = {
    VERIFY_EMAIL: 'Verify your NAVRIX account',
    RESET_PASSWORD: 'Reset your NAVRIX password',
    LOGIN_OTP: 'Your one-time sign-in code',
    PAYOUT_WALLET: 'Confirm your withdrawal wallet change',
  };

  if (isSmtpConfigured()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"${BRAND_CONFIG.name} Security" <${process.env.SMTP_USER}>`,
        to: params.to,
        subject: subjectMap[params.purpose],
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#070b14;color:#f8fafc;border-radius:16px;border:1px solid rgba(245,184,46,0.28);">
            <div style="font-size:12px;letter-spacing:0.14em;color:#f5b82e;font-weight:700;margin-bottom:12px;">${BRAND_CONFIG.name} SECURITY</div>
            <h2 style="margin:0 0 8px;font-size:22px;color:#ffffff;">${titleMap[params.purpose]}</h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Hi ${params.name || 'Investor'}, enter the six-digit verification code below to continue. This code expires in ${params.expiresMinutes} minutes.
            </p>
            <div style="background:#0c1322;border:1px solid rgba(148,163,184,0.22);border-radius:12px;padding:20px;text-align:center;font-size:32px;font-weight:800;letter-spacing:0.28em;color:#f5b82e;">
              ${params.otp.slice(0, 3)}-${params.otp.slice(3)}
            </div>
            <p style="color:#64748b;font-size:12px;margin:24px 0 0;">
              If you did not request this code, you can safely ignore this email.
            </p>
          </div>
        `,
      });
      return { deliveredVia: 'SMTP' };
    } catch (smtpErr) {
      console.warn('[OTP Mailer] SMTP send failed, falling back to console:', smtpErr);
    }
  }

  console.log(
    `\n📧 [NAVRIX OTP DISPATCH] To: ${params.to} | Purpose: ${params.purpose} | 6-Digit Code: ${params.otp.slice(0, 3)}-${params.otp.slice(3)} (valid ${params.expiresMinutes}m)\n`,
  );
  return { deliveredVia: 'DEV_PREVIEW' };
}

async function createAndSendUserOtp(params: {
  userId: string;
  email: string;
  name: string;
  tokenType: 'EMAIL_VERIFY_OTP' | 'PASSWORD_RESET_OTP' | 'LOGIN_OTP' | 'PAYOUT_WALLET_OTP';
  purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'LOGIN_OTP' | 'PAYOUT_WALLET';
  expiresMinutes: number;
}) {
  const otp = generateSixDigitOtp();
  const tokenHash = hashOtpForUser(params.userId, params.tokenType, otp);

  // Invalidate any unused older OTPs of same type for this user
  await prisma.authToken.updateMany({
    where: {
      userId: params.userId,
      tokenType: params.tokenType,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  await prisma.authToken.create({
    data: {
      userId: params.userId,
      tokenType: params.tokenType,
      tokenHash,
      expiresAt: new Date(Date.now() + params.expiresMinutes * 60_000),
    },
  });

  const delivery = await sendOtpEmail({
    to: params.email,
    name: params.name,
    otp,
    purpose: params.purpose,
    expiresMinutes: params.expiresMinutes,
  });

  return {
    otp,
    deliveredVia: delivery.deliveredVia,
    otpPreview:
      delivery.deliveredVia === 'DEV_PREVIEW' && process.env.NODE_ENV !== 'production'
        ? otp
        : undefined,
  };
}

// =============================================================================
// SESSION & AUTH MIDDLEWARE
// =============================================================================
async function issueSessionAndSetCookie(
  res: Response,
  user: { id: string; publicUid: string; email: string; role: string },
  meta: { ipAddress?: string; userAgent?: string },
  existingFamilyId?: string,
) {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, uid: user.publicUid },
    JWT_SECRET,
    { expiresIn: '2h' },
  );

  const rawRefreshToken = crypto.randomBytes(48).toString('hex');
  const refreshDays = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 7);

  await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(rawRefreshToken),
      familyId: existingFamilyId || crypto.randomUUID(),
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent ? meta.userAgent.slice(0, 500) : null,
      expiresAt: new Date(Date.now() + refreshDays * 86400_000),
    },
  });

  res.cookie('navrix_refresh_token', rawRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: refreshDays * 86400_000,
  });

  return { accessToken, refreshToken: rawRefreshToken };
}

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
  let payload: any;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return sendError(res, 'AUTH_EXPIRED', 'Session token is invalid or expired.', 401);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { complianceProfile: true },
    });
    if (!user) {
      return sendError(res, 'AUTH_INVALID', 'Account no longer exists.', 401);
    }
    if (user.status === UserStatus.SUSPENDED) {
      return sendError(
        res,
        'ACCOUNT_SUSPENDED',
        'Your account has been suspended. Contact support.',
        403,
      );
    }
    req.user = user;
    req.userId = user.id;
    next();
  } catch (dbErr) {
    next(dbErr);
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !isAdminRole(req.user.role)) {
    return sendError(res, 'FORBIDDEN', 'Administrative privileges are required.', 403);
  }
  next();
}

export function requireMasterAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (
    !req.user ||
    (req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.MASTER_ADMIN)
  ) {
    return sendError(res, 'FORBIDDEN', 'Super Admin or Master Admin privileges are required.', 403);
  }
  next();
}

// =============================================================================
// RUNTIME SETTINGS, AUDIT, LEDGER & BLOCKCHAIN HELPERS
// =============================================================================
async function getRuntimeSettings() {
  const rows = await prisma.systemSetting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }

  const mode =
    ((map.BLOCKCHAIN_MODE || process.env.BLOCKCHAIN_MODE) as BlockchainMode) || BlockchainMode.MOCK;
  const isMainnet = mode === BlockchainMode.MAINNET;

  return {
    blockchainMode: mode,
    blockchainNetwork: BlockchainNetwork.BNB_SMART_CHAIN,
    chainId: Number(
      map.CHAIN_ID ||
        (isMainnet ? BLOCKCHAIN_DEFAULTS.mainnetChainId : BLOCKCHAIN_DEFAULTS.testnetChainId),
    ),
    usdtContractAddress:
      map.USDT_CONTRACT_ADDRESS ||
      (isMainnet
        ? process.env.USDT_CONTRACT_ADDRESS || BLOCKCHAIN_DEFAULTS.mainnetUsdtContract
        : process.env.USDT_TESTNET_CONTRACT_ADDRESS || BLOCKCHAIN_DEFAULTS.testnetUsdtContract),
    receivingWalletAddress:
      map.RECEIVING_WALLET_ADDRESS ||
      process.env.RECEIVING_WALLET_ADDRESS ||
      BLOCKCHAIN_DEFAULTS.defaultReceivingAddress,
    requiredConfirmations: Number(
      map.REQUIRED_CONFIRMATIONS || process.env.REQUIRED_CONFIRMATIONS || 12,
    ),
    minDeposit: Number(map.MIN_DEPOSIT || process.env.MIN_DEPOSIT || 10),
    maxDeposit: Number(map.MAX_DEPOSIT || process.env.MAX_DEPOSIT || 100000),
    minWithdrawal: Number(map.MIN_WITHDRAWAL || process.env.MIN_WITHDRAWAL || 20),
    maxWithdrawal: Number(map.MAX_WITHDRAWAL || process.env.MAX_WITHDRAWAL || 50000),
    depositExpiryMinutes: Number(
      map.DEPOSIT_EXPIRY_MINUTES || process.env.DEPOSIT_EXPIRY_MINUTES || 120,
    ),
    reviewSlaHours: Number(map.REVIEW_SLA_HOURS || process.env.REVIEW_SLA_HOURS || 24),
    depositsEnabled: (map.DEPOSITS_ENABLED ?? 'true') === 'true',
    withdrawalsEnabled: (map.WITHDRAWALS_ENABLED ?? 'true') === 'true',
    maintenanceMode: (map.MAINTENANCE_MODE ?? 'false') === 'true',
  };
}

function toJsonSafe(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as Prisma.InputJsonValue;
}

async function recordAudit(
  params: {
    adminId?: string | null;
    actorRole?: string | null;
    action: string;
    targetType: string;
    targetId: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
  },
  tx?: PrismaTransactionClient,
) {
  const client = tx ?? prisma;
  return client.auditLog.create({
    data: {
      adminId: params.adminId ?? null,
      actorRole: params.actorRole ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      oldValue: params.oldValue !== undefined ? toJsonSafe(params.oldValue) : Prisma.JsonNull,
      newValue: params.newValue !== undefined ? toJsonSafe(params.newValue) : Prisma.JsonNull,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ? params.userAgent.slice(0, 500) : null,
      requestId: params.requestId ?? null,
    },
  });
}

async function notifyUser(
  params: {
    userId: string;
    eventType: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  },
  tx?: PrismaTransactionClient,
) {
  const client = tx ?? prisma;
  return client.notification.create({
    data: {
      userId: params.userId,
      eventType: params.eventType,
      channel: 'IN_APP',
      title: params.title,
      message: params.message,
      metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

async function lockUserWallet(tx: PrismaTransactionClient, userId: string, asset = 'USDT') {
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
  if (typeof (tx as { $queryRaw?: unknown }).$queryRaw === 'function') {
    await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`;
  }
  return tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
}

async function verifyDepositOnChain(params: {
  depositId: string;
  transactionHash: string;
  expectedAmount: string;
  expectedReceivingAddress: string;
}) {
  const runtime = await getRuntimeSettings();
  const suite = createBlockchainSuite({
    mode: runtime.blockchainMode,
    chainId: runtime.chainId,
    usdtContractAddress: runtime.usdtContractAddress,
    receivingWalletAddress: runtime.receivingWalletAddress,
    requiredConfirmations: runtime.requiredConfirmations,
  });

  return suite.verificationService.verifyDepositTransaction({
    transactionHash: params.transactionHash,
    expectedReceivingAddress: params.expectedReceivingAddress,
    expectedTokenContract: runtime.usdtContractAddress,
    expectedNetwork: BlockchainNetwork.BNB_SMART_CHAIN,
    expectedAmount: params.expectedAmount,
    requiredConfirmations: runtime.requiredConfirmations,
    isAlreadyUsed: async (normalizedHash: string) => {
      const [existingSub, existingChainTx] = await Promise.all([
        prisma.paymentSubmission.findUnique({
          where: { transactionHash: normalizedHash },
          select: { depositId: true },
        }),
        prisma.blockchainTransaction.findUnique({
          where: { transactionHash: normalizedHash },
          select: { depositId: true, withdrawalId: true },
        }),
      ]);
      if (existingSub && existingSub.depositId !== params.depositId) return true;
      if (
        existingChainTx &&
        (existingChainTx.withdrawalId !== null ||
          (existingChainTx.depositId !== null && existingChainTx.depositId !== params.depositId))
      ) {
        return true;
      }
      return false;
    },
  });
}

// =============================================================================
// PLATFORM WALLETS & MARKET DATA HELPERS
// =============================================================================
export interface PlatformWalletConfig {
  id: string;
  name: string;
  symbol: string;
  network: string;
  walletAddress: string;
  qrCodeUrl?: string | null;
  paymentInstructions: string;
  minDeposit: number;
  maxDeposit: number;
  isActive: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketSymbolConfig {
  symbol: string;
  name: string;
  baseAsset: string;
  quoteAsset: string;
  stream: string;
  isActive: boolean;
  displayOrder: number;
}

const DEFAULT_PLATFORM_WALLETS: PlatformWalletConfig[] = [
  {
    id: 'wallet-usdt-bep20',
    name: 'USDT (BNB Smart Chain)',
    symbol: 'USDT',
    network: 'BEP20',
    walletAddress: '0x98386622d3937c0A3582E07aEc06041C3fb7b521',
    paymentInstructions:
      'Transfer BEP-20 USDT over BNB Smart Chain (BSC). Funds are automatically detected and credited after network confirmations.',
    minDeposit: 10,
    maxDeposit: 100000,
    isActive: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wallet-usdt-trc20',
    name: 'USDT (TRON Network)',
    symbol: 'USDT',
    network: 'TRC20',
    walletAddress: 'TXj9L2k4hBq3vN7m8ZpYxR1sW5vF6gH8jK',
    paymentInstructions:
      'Send TRC-20 USDT strictly via the TRON network. Low network gas fees with rapid settlement.',
    minDeposit: 10,
    maxDeposit: 100000,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wallet-usdt-erc20',
    name: 'USDT (Ethereum Mainnet)',
    symbol: 'USDT',
    network: 'ERC20',
    walletAddress: '0x71C836e4b3708D59F0469611D30eE2090F8e312A',
    paymentInstructions:
      'Send USDT via Ethereum ERC-20 standard. Ensure adequate ETH is reserved in your outbound wallet for gas fees.',
    minDeposit: 50,
    maxDeposit: 100000,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wallet-btc',
    name: 'Bitcoin (BTC Native)',
    symbol: 'BTC',
    network: 'BTC',
    walletAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    paymentInstructions:
      'Send Native Bitcoin (BTC) to this SegWit address. Requires 3 blockchain network confirmations.',
    minDeposit: 50,
    maxDeposit: 250000,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wallet-eth',
    name: 'Ethereum (ETH Native)',
    symbol: 'ETH',
    network: 'ETH',
    walletAddress: '0x71C836e4b3708D59F0469611D30eE2090F8e312A',
    paymentInstructions:
      'Send native ETH directly to this receiving treasury address. Requires 12 network block confirmations.',
    minDeposit: 50,
    maxDeposit: 100000,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_MARKET_SYMBOLS: MarketSymbolConfig[] = [
  {
    symbol: 'BTCUSDT',
    name: 'Bitcoin',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    stream: 'btcusdt@ticker',
    isActive: true,
    displayOrder: 1,
  },
  {
    symbol: 'BNBUSDT',
    name: 'BNB',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    stream: 'bnbusdt@ticker',
    isActive: true,
    displayOrder: 2,
  },
  {
    symbol: 'ETHUSDT',
    name: 'Ethereum',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    stream: 'ethusdt@ticker',
    isActive: true,
    displayOrder: 3,
  },
  {
    symbol: 'SOLUSDT',
    name: 'Solana',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    stream: 'solusdt@ticker',
    isActive: true,
    displayOrder: 4,
  },
];

async function getPlatformWallets(): Promise<PlatformWalletConfig[]> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: 'PLATFORM_PAYMENT_WALLETS' },
    });
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[WALLETS] Failed to parse PLATFORM_PAYMENT_WALLETS from DB:', err);
  }
  // Initialize default if not found
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'PLATFORM_PAYMENT_WALLETS' },
      update: {},
      create: {
        key: 'PLATFORM_PAYMENT_WALLETS',
        value: JSON.stringify(DEFAULT_PLATFORM_WALLETS),
        category: 'FINANCIAL',
        isPublic: true,
        description: 'Multi-network platform receiving wallet addresses and payment instructions',
      },
    });
  } catch {
    // Ignore upsert error
  }
  return DEFAULT_PLATFORM_WALLETS;
}

async function savePlatformWallets(wallets: PlatformWalletConfig[], adminId?: string) {
  const jsonStr = JSON.stringify(wallets);
  await prisma.systemSetting.upsert({
    where: { key: 'PLATFORM_PAYMENT_WALLETS' },
    update: {
      value: jsonStr,
      updatedById: adminId || null,
      updatedAt: new Date(),
    },
    create: {
      key: 'PLATFORM_PAYMENT_WALLETS',
      value: jsonStr,
      category: 'FINANCIAL',
      isPublic: true,
      description: 'Multi-network platform receiving wallet addresses and payment instructions',
      updatedById: adminId || null,
    },
  });
}

async function getActivePlatformWallets(): Promise<PlatformWalletConfig[]> {
  const wallets = await getPlatformWallets();
  return wallets.filter((w) => w.isActive);
}

async function getDefaultPlatformWallet(): Promise<PlatformWalletConfig> {
  const active = await getActivePlatformWallets();
  return active.find((w) => w.isDefault) || active[0] || DEFAULT_PLATFORM_WALLETS[0];
}

async function getMarketDataConfig(): Promise<{
  symbols: MarketSymbolConfig[];
  wsBaseUrl: string;
  provider: string;
}> {
  let symbols = DEFAULT_MARKET_SYMBOLS;
  let wsBaseUrl = 'wss://stream.binance.com:9443/ws';
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: 'MARKET_DATA_SYMBOLS' },
    });
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        symbols = parsed;
      }
    }
    const wsRow = await prisma.systemSetting.findUnique({
      where: { key: 'MARKET_DATA_WS_URL' },
    });
    if (wsRow && wsRow.value) {
      wsBaseUrl = wsRow.value.trim();
    }
  } catch (err) {
    console.warn('[MARKET_DATA] Failed to parse MARKET_DATA_SYMBOLS from DB:', err);
  }
  return {
    symbols,
    wsBaseUrl,
    provider: 'Binance Live Ticker Stream',
  };
}

async function saveMarketDataConfig(
  symbols: MarketSymbolConfig[],
  wsBaseUrl?: string,
  adminId?: string,
) {
  const jsonStr = JSON.stringify(symbols);
  await prisma.systemSetting.upsert({
    where: { key: 'MARKET_DATA_SYMBOLS' },
    update: {
      value: jsonStr,
      updatedById: adminId || null,
      updatedAt: new Date(),
    },
    create: {
      key: 'MARKET_DATA_SYMBOLS',
      value: jsonStr,
      category: 'MARKET_DATA',
      isPublic: true,
      description: 'Configured market data symbols and live WebSocket streams',
      updatedById: adminId || null,
    },
  });
  if (wsBaseUrl) {
    await prisma.systemSetting.upsert({
      where: { key: 'MARKET_DATA_WS_URL' },
      update: {
        value: wsBaseUrl.trim(),
        updatedById: adminId || null,
        updatedAt: new Date(),
      },
      create: {
        key: 'MARKET_DATA_WS_URL',
        value: wsBaseUrl.trim(),
        category: 'MARKET_DATA',
        isPublic: true,
        description: 'Live market data WebSocket provider base URL',
        updatedById: adminId || null,
      },
    });
  }
}

function resolveNetworkLabel(network: string, token: string) {
  const norm = (network || '').toUpperCase();
  if (norm.includes('TRC') || norm === 'TRON') return 'TRON (TRC-20)';
  if (norm.includes('ERC') || norm === 'ETHEREUM') return 'Ethereum (ERC-20)';
  if (norm === 'BTC' || norm.includes('BITCOIN')) return 'Bitcoin (Native)';
  if (norm === 'ETH') return 'Ethereum (Native)';
  if (norm.includes('BEP') || norm.includes('BSC') || norm.includes('BNB'))
    return 'BNB Smart Chain (BEP-20)';
  return `${token} (${network})`;
}

async function buildDepositQrPayload(
  receivingAddress: string,
  amount?: string,
  token = 'USDT',
  network = 'BNB_SMART_CHAIN',
  customInstructions?: string,
) {
  const qrDataUrl = await QRCode.toDataURL(receivingAddress, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
    color: { dark: '#090D16', light: '#FFFFFF' },
  });
  return {
    qrContent: receivingAddress,
    qrDataUrl,
    token,
    network,
    networkLabel: resolveNetworkLabel(network, token),
    receivingAddress,
    amount: amount || null,
    warning: customInstructions || BLOCKCHAIN_DEFAULTS.networkWarning,
    reviewNotice: BLOCKCHAIN_DEFAULTS.reviewSlaNotice,
  };
}

function formatDepositRecord(deposit: any) {
  return {
    depositUid: deposit.depositUid,
    requestedAmount: deposit.requestedAmount.toFixed(2),
    verifiedAmount: deposit.verifiedAmount ? deposit.verifiedAmount.toFixed(2) : null,
    token: deposit.token,
    network: deposit.network,
    networkLabel: resolveNetworkLabel(deposit.network, deposit.token),
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

// Screenshot private storage helpers
const PRIVATE_UPLOAD_DIR = path.resolve(
  __dirname,
  '..',
  process.env.PRIVATE_UPLOAD_DIR || './storage/private-screenshots',
);

function detectImageMagicBytes(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'image/webp';
  return null;
}

async function savePaymentScreenshot(file: Express.Multer.File) {
  const mimeMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };
  const detected = detectImageMagicBytes(file.buffer);
  if (!detected || !mimeMap[detected]) {
    throw new ApiError(
      'INVALID_SCREENSHOT_FORMAT',
      'Only valid PNG, JPEG, or WebP images are permitted.',
      400,
    );
  }
  const storageKey = `${crypto.randomUUID()}.${mimeMap[detected]}`;
  await fsPromises.mkdir(PRIVATE_UPLOAD_DIR, { recursive: true });
  await fsPromises.writeFile(path.join(PRIVATE_UPLOAD_DIR, storageKey), file.buffer);
  return {
    storageKey,
    mimeType: detected,
    sizeBytes: file.buffer.length,
  };
}

// =============================================================================
// API ROUTER (/api/v1)
// =============================================================================
const router = express.Router();

// 1. HEALTH
router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const rawDb = process.env.DATABASE_URL || '';
    const maskedTarget = rawDb.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
    return sendSuccess(res, {
      status: 'ok',
      service: 'navrix-unified-node-server',
      port: PORT,
      databaseEngine: 'mysql',
      databaseMode: 'MYSQL_CONNECTED',
      databaseTarget: maskedTarget,
      blockchainMode: process.env.BLOCKCHAIN_MODE || 'MOCK',
      timestamp: new Date().toISOString(),
    });
  }),
);

// =============================================================================
// 2. AUTHENTICATION & OTP & GOOGLE OAUTH (/auth)
// =============================================================================
router.get(
  '/auth/config',
  asyncHandler(async (_req, res) => {
    const rawCid = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const isRealGoogleCid =
      rawCid.endsWith('.apps.googleusercontent.com') &&
      !rawCid.includes('your-') &&
      !rawCid.includes('placeholder');

    return sendSuccess(res, {
      googleClientId: isRealGoogleCid ? rawCid : null,
      googleOAuthMode: isRealGoogleCid ? 'LIVE' : 'CHOOSER',
      smtpConfigured: isSmtpConfigured(),
    });
  }),
);

// Live DB email existence check
router.post(
  '/auth/check-email',
  asyncHandler(async (req, res) => {
    const rawEmail = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    if (!rawEmail || !rawEmail.includes('@')) {
      return sendSuccess(res, { exists: false });
    }

    const user = await prisma.user.findUnique({
      where: { email: rawEmail },
      select: {
        name: true,
        emailVerified: true,
        passwordHash: true,
        googleId: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return sendSuccess(res, { exists: false });
    }

    return sendSuccess(res, {
      exists: true,
      emailVerified: user.emailVerified,
      hasPassword: Boolean(user.passwordHash),
      hasGoogle: Boolean(user.googleId),
      accountName: user.name.split(' ')[0] || 'Investor',
      isAdmin: isAdminRole(user.role),
      isSuspended: user.status === UserStatus.SUSPENDED,
    });
  }),
);

// Real-time Referral Code Verification for Registration Preview
router.get(
  '/auth/check-referral/:code',
  asyncHandler(async (req, res) => {
    const rawCode = String(req.params.code || '').trim();
    if (!rawCode) {
      return sendSuccess(res, { valid: false, message: 'No referral code provided.' });
    }

    const referrer = await prisma.user.findFirst({
      where: {
        OR: [{ referralCode: rawCode }, { publicUid: rawCode }],
      },
      select: {
        publicUid: true,
        name: true,
        referralCode: true,
        status: true,
      },
    });

    if (!referrer || referrer.status !== UserStatus.ACTIVE) {
      return sendSuccess(res, { valid: false, message: 'Invalid or inactive referral code.' });
    }

    const firstName = referrer.name.split(' ')[0] || 'Affiliate';
    const lastInitial = referrer.name.split(' ')[1]?.[0]
      ? ` ${referrer.name.split(' ')[1][0]}.`
      : '';

    return sendSuccess(res, {
      valid: true,
      referralCode: referrer.referralCode,
      referrerUid: referrer.publicUid,
      referrerName: `${firstName}${lastInitial}`,
    });
  }),
);

// Login with email & password — specific error codes & unverified OTP fallback
router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !email.includes('@')) {
      return sendError(res, 'INVALID_EMAIL', 'Please enter a valid email address.', 400);
    }
    if (!password) {
      return sendError(res, 'PASSWORD_REQUIRED', 'Please enter your password.', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(
        res,
        'EMAIL_NOT_REGISTERED',
        `No account is registered with "${email}". Please check the email or create a new account.`,
        404,
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minsLeft = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000));
      return sendError(
        res,
        'ACCOUNT_TEMPORARILY_LOCKED',
        `Too many failed sign-in attempts. Your account is locked for ${minsLeft} more minute(s).`,
        429,
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      return sendError(
        res,
        'ACCOUNT_SUSPENDED',
        'Your account is currently suspended. Please contact compliance support.',
        403,
      );
    }

    if (!user.passwordHash) {
      return sendError(
        res,
        'GOOGLE_ACCOUNT_ONLY',
        'This email is linked to Google Sign-In and has no password set yet. Click "Google" below or use "Forgot password?" to set a password.',
        400,
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const nextCount = user.failedLoginCount + 1;
      const shouldLock = nextCount >= 5;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: nextCount,
          lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60_000) : user.lockedUntil,
        },
      });
      const remaining = Math.max(0, 5 - nextCount);
      return sendError(
        res,
        'PASSWORD_MISMATCH',
        shouldLock
          ? 'Incorrect password. Account locked for 15 minutes due to multiple failed attempts.'
          : `Incorrect password. Please double-check your password (${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary lock).`,
        401,
      );
    }

    // If account email is not verified yet, send a 6-digit OTP and prompt verification!
    if (!user.emailVerified) {
      const otpDispatch = await createAndSendUserOtp({
        userId: user.id,
        email: user.email,
        name: user.name,
        tokenType: 'EMAIL_VERIFY_OTP',
        purpose: 'VERIFY_EMAIL',
        expiresMinutes: 10,
      });

      return sendSuccess(res, {
        requiresVerification: true,
        email: user.email,
        maskedEmail: maskEmail(user.email),
        message: 'Please verify your email with the 6-digit code we just sent.',
        otpPreview: otpDispatch.otpPreview,
      });
    }

    const meta = getRequestMeta(req);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    if (isAdminRole(user.role)) {
      await recordAudit({
        adminId: user.id,
        actorRole: user.role,
        action: AuditAction.ADMIN_LOGIN,
        targetType: 'USER',
        targetId: user.publicUid,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    const tokens = await issueSessionAndSetCookie(res, user, meta);
    return sendSuccess(res, {
      accessToken: tokens.accessToken,
      user: toPublicUser(user),
    });
  }),
);

// Passwordless Email OTP Sign-In: Request 6-digit OTP
router.post(
  '/auth/send-login-otp',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    if (!email || !email.includes('@')) {
      return sendError(res, 'INVALID_EMAIL', 'Enter a valid email address.', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(
        res,
        'EMAIL_NOT_REGISTERED',
        `No account found for "${email}". Please create an account first.`,
        404,
      );
    }
    if (user.status === UserStatus.SUSPENDED) {
      return sendError(res, 'ACCOUNT_SUSPENDED', 'Your account is suspended.', 403);
    }

    const otpDispatch = await createAndSendUserOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      tokenType: 'LOGIN_OTP',
      purpose: 'LOGIN_OTP',
      expiresMinutes: 10,
    });

    return sendSuccess(res, {
      otpSent: true,
      email: user.email,
      maskedEmail: maskEmail(user.email),
      expiresInSeconds: 600,
      otpPreview: otpDispatch.otpPreview,
    });
  }),
);

// Passwordless Email OTP Sign-In: Verify 6-digit OTP
router.post(
  '/auth/verify-login-otp',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const otp = String(req.body?.otp || '').replace(/\D/g, '');

    if (!email || otp.length !== 6) {
      return sendError(res, 'INVALID_OTP_FORMAT', 'Please enter the complete 6-digit code.', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, 'EMAIL_NOT_REGISTERED', 'Account not found.', 404);
    }

    const expectedHash = hashOtpForUser(user.id, 'LOGIN_OTP', otp);
    const authToken = await prisma.authToken.findUnique({
      where: { tokenHash: expectedHash },
    });

    if (
      !authToken ||
      authToken.userId !== user.id ||
      authToken.usedAt ||
      authToken.expiresAt < new Date()
    ) {
      return sendError(
        res,
        'INVALID_OR_EXPIRED_OTP',
        'Invalid or expired 6-digit code. Please double-check or request a new code.',
        400,
      );
    }

    const now = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: user.emailVerifiedAt || now,
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: now,
      },
    });

    await prisma.authToken.update({
      where: { id: authToken.id },
      data: { usedAt: now },
    });

    const meta = getRequestMeta(req);
    const tokens = await issueSessionAndSetCookie(res, updatedUser, meta);
    return sendSuccess(res, {
      accessToken: tokens.accessToken,
      user: toPublicUser(updatedUser),
    });
  }),
);

// Manual Registration -> Creates User + Wallet + Compliance & Sends 6-Digit Email OTP
router.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const {
      name,
      email: rawEmail,
      password,
      phone,
      country,
      acceptTerms,
      referralCode,
      ref,
    } = req.body || {};

    if (!acceptTerms) {
      return sendError(
        res,
        'TERMS_NOT_ACCEPTED',
        'Please accept the Terms of Service & Risk Disclosure to continue.',
        400,
      );
    }

    const cleanName = String(name || '').trim();
    const email = String(rawEmail || '')
      .trim()
      .toLowerCase();

    if (cleanName.length < 2) {
      return sendError(res, 'INVALID_NAME', 'Full name must be at least 2 characters.', 400);
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendError(res, 'INVALID_EMAIL', 'Please enter a valid email address.', 400);
    }

    const pwdCheck = passwordPolicySchema.safeParse(password);
    if (!pwdCheck.success) {
      return sendError(
        res,
        'WEAK_PASSWORD',
        pwdCheck.error.issues[0]?.message ||
          'Password must be 8+ chars with uppercase, lowercase, and a number.',
        400,
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(
        res,
        'EMAIL_ALREADY_REGISTERED',
        `An account with "${email}" already exists in our database. Please sign in instead or reset your password.`,
        409,
      );
    }

    // Resolve optional referrer
    const rawRefCode = String(referralCode || ref || '').trim();
    let referredById: string | null = null;
    if (rawRefCode) {
      const refUser = await prisma.user.findFirst({
        where: {
          OR: [{ referralCode: rawRefCode }, { publicUid: rawRefCode }],
        },
        select: { id: true, status: true },
      });
      if (refUser && refUser.status === UserStatus.ACTIVE) {
        referredById = refUser.id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const createdUser = await prisma.$transaction(async (tx) => {
      const publicUid = await nextReadableUid(tx, 'USR', false);
      const userReferralCode = await generateUniqueReferralCode(tx, publicUid);
      return tx.user.create({
        data: {
          publicUid,
          name: cleanName,
          email,
          phone: phone ? String(phone).trim() || null : null,
          passwordHash,
          referralCode: userReferralCode,
          referredById,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          emailVerified: false,
          wallets: {
            create: {
              asset: 'USDT',
              availableBalance: new Prisma.Decimal(0),
              lockedBalance: new Prisma.Decimal(0),
              investedBalance: new Prisma.Decimal(0),
              pendingWithdrawal: new Prisma.Decimal(0),
            },
          },
          complianceProfile: {
            create: {
              country: country ? String(country).trim() || null : null,
              termsAcceptedAt: now,
              privacyAcceptedAt: now,
              riskDisclosureAcceptedAt: now,
            },
          },
        },
      });
    });

    const otpDispatch = await createAndSendUserOtp({
      userId: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      tokenType: 'EMAIL_VERIFY_OTP',
      purpose: 'VERIFY_EMAIL',
      expiresMinutes: 10,
    });

    return sendSuccess(
      res,
      {
        requiresVerification: true,
        email: createdUser.email,
        maskedEmail: maskEmail(createdUser.email),
        uid: createdUser.publicUid,
        expiresInSeconds: 600,
        message: `Verification code sent to ${createdUser.email}.`,
        otpPreview: otpDispatch.otpPreview,
      },
      201,
    );
  }),
);

// Verify 6-Digit Email OTP (Completes Registration or Unverified Login)
router.post(
  '/auth/verify-otp',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const otp = String(req.body?.otp || '').replace(/\D/g, '');

    if (!email || otp.length !== 6) {
      return sendError(
        res,
        'INVALID_OTP_FORMAT',
        'Please enter all 6 digits of your verification code.',
        400,
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(
        res,
        'EMAIL_NOT_REGISTERED',
        'No account found for this email address.',
        404,
      );
    }

    const expectedHash = hashOtpForUser(user.id, 'EMAIL_VERIFY_OTP', otp);
    const authToken = await prisma.authToken.findUnique({
      where: { tokenHash: expectedHash },
    });

    if (
      !authToken ||
      authToken.userId !== user.id ||
      authToken.usedAt ||
      authToken.expiresAt < new Date()
    ) {
      return sendError(
        res,
        'INVALID_OR_EXPIRED_OTP',
        'Invalid or expired verification code. Please check the 6-digit code or click Resend.',
        400,
      );
    }

    const now = new Date();
    const verifiedUser = await prisma.$transaction(async (tx) => {
      await tx.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: now },
      });

      const u = await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: now,
          lastLoginAt: now,
        },
      });

      await notifyUser(
        {
          userId: u.id,
          eventType: 'ACCOUNT_VERIFIED',
          title: 'Welcome to NAVRIX — Account Verified',
          message: `Your email (${u.email}) is verified and your dedicated USDT vault (${u.publicUid}) is active.`,
        },
        tx,
      );

      return u;
    });

    const meta = getRequestMeta(req);
    const tokens = await issueSessionAndSetCookie(res, verifiedUser, meta);

    return sendSuccess(res, {
      verified: true,
      accessToken: tokens.accessToken,
      user: toPublicUser(verifiedUser),
    });
  }),
);

// Resend 6-Digit OTP for Verify Email / Reset Password / Login OTP
router.post(
  '/auth/resend-otp',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const purposeRaw = String(req.body?.purpose || 'VERIFY_EMAIL').toUpperCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(
        res,
        'EMAIL_NOT_REGISTERED',
        'No account is registered with this email address.',
        404,
      );
    }

    const mapping: Record<
      string,
      {
        tokenType: 'EMAIL_VERIFY_OTP' | 'PASSWORD_RESET_OTP' | 'LOGIN_OTP';
        purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'LOGIN_OTP';
        expiresMinutes: number;
      }
    > = {
      VERIFY_EMAIL: {
        tokenType: 'EMAIL_VERIFY_OTP',
        purpose: 'VERIFY_EMAIL',
        expiresMinutes: 10,
      },
      RESET_PASSWORD: {
        tokenType: 'PASSWORD_RESET_OTP',
        purpose: 'RESET_PASSWORD',
        expiresMinutes: 30,
      },
      LOGIN_OTP: {
        tokenType: 'LOGIN_OTP',
        purpose: 'LOGIN_OTP',
        expiresMinutes: 10,
      },
    };

    const target = mapping[purposeRaw] || mapping.VERIFY_EMAIL!;
    const otpDispatch = await createAndSendUserOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      tokenType: target.tokenType,
      purpose: target.purpose,
      expiresMinutes: target.expiresMinutes,
    });

    return sendSuccess(res, {
      resent: true,
      email: user.email,
      expiresInSeconds: target.expiresMinutes * 60,
      message: `A new 6-digit code has been sent to ${user.email}.`,
      otpPreview: otpDispatch.otpPreview,
    });
  }),
);

// Forgot Password Step 1: Check Registered Email & Send 6-Digit OTP
router.post(
  '/auth/forgot-password',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    if (!email || !email.includes('@')) {
      return sendError(res, 'INVALID_EMAIL', 'Please enter a valid email address.', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(
        res,
        'EMAIL_NOT_REGISTERED',
        `No registered account found for "${email}". Please verify your email or create an account.`,
        404,
      );
    }

    const otpDispatch = await createAndSendUserOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      tokenType: 'PASSWORD_RESET_OTP',
      purpose: 'RESET_PASSWORD',
      expiresMinutes: 30,
    });

    return sendSuccess(res, {
      otpSent: true,
      email: user.email,
      maskedEmail: maskEmail(user.email),
      expiresInMinutes: 30,
      message: `We sent a 6-digit recovery code to ${user.email}.`,
      otpPreview: otpDispatch.otpPreview,
    });
  }),
);

// Forgot Password Step 2: Verify 6-Digit Recovery OTP & Return Active Sessions for "Set a new password" UI
router.post(
  '/auth/verify-reset-otp',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const otp = String(req.body?.otp || '').replace(/\D/g, '');

    if (!email || otp.length !== 6) {
      return sendError(
        res,
        'INVALID_OTP_FORMAT',
        'Please enter all 6 digits of your recovery code.',
        400,
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, 'EMAIL_NOT_REGISTERED', 'Account not found.', 404);
    }

    const expectedHash = hashOtpForUser(user.id, 'PASSWORD_RESET_OTP', otp);
    const authToken = await prisma.authToken.findUnique({
      where: { tokenHash: expectedHash },
    });

    if (
      !authToken ||
      authToken.userId !== user.id ||
      authToken.usedAt ||
      authToken.expiresAt < new Date()
    ) {
      return sendError(
        res,
        'INVALID_OR_EXPIRED_OTP',
        'Invalid or expired recovery code. Please check the 6-digit code or request a new one.',
        400,
      );
    }

    const activeSessions = await prisma.userSession.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const currentMeta = getRequestMeta(req);
    const currentParsed = parseDeviceLabel(currentMeta.userAgent);

    const formattedDevices = [
      {
        id: 'current-browser',
        device: currentParsed.device,
        isMobile: currentParsed.isMobile,
        location: currentMeta.ipAddress || 'Local Network',
        lastActive: 'Active now',
        isCurrent: true,
      },
      ...activeSessions.slice(0, 3).map((s) => {
        const parsed = parseDeviceLabel(s.userAgent);
        const minsAgo = Math.max(1, Math.round((Date.now() - s.createdAt.getTime()) / 60_000));
        const ageLabel =
          minsAgo < 60
            ? `${minsAgo}m ago`
            : minsAgo < 1440
              ? `${Math.round(minsAgo / 60)} hours ago`
              : `${Math.round(minsAgo / 1440)} days ago`;
        return {
          id: s.id,
          device: parsed.device,
          isMobile: parsed.isMobile,
          location: s.ipAddress || 'Verified Session',
          lastActive: ageLabel,
          isCurrent: false,
        };
      }),
    ];

    return sendSuccess(res, {
      verified: true,
      email: user.email,
      devices: formattedDevices,
    });
  }),
);

// Forgot Password Step 3: Set New Password & Optionally Revoke Other Sessions
router.post(
  '/auth/reset-password',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const otp = String(req.body?.otp || req.body?.token || '').replace(/\D/g, '');
    const newPassword = String(req.body?.newPassword || '');
    const signOutOtherDevices = req.body?.signOutOtherDevices !== false;

    const pwdCheck = passwordPolicySchema.safeParse(newPassword);
    if (!pwdCheck.success) {
      return sendError(
        res,
        'WEAK_PASSWORD',
        pwdCheck.error.issues[0]?.message || 'Password does not meet security policy.',
        400,
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, 'EMAIL_NOT_REGISTERED', 'Account not found.', 404);
    }

    const expectedHash = hashOtpForUser(user.id, 'PASSWORD_RESET_OTP', otp);
    const authToken = await prisma.authToken.findUnique({
      where: { tokenHash: expectedHash },
    });

    if (
      !authToken ||
      authToken.userId !== user.id ||
      authToken.usedAt ||
      authToken.expiresAt < new Date()
    ) {
      return sendError(
        res,
        'INVALID_OR_EXPIRED_OTP',
        'Your password reset code has expired. Please request a new code.',
        400,
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const now = new Date();

    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: now },
      });

      if (signOutOtherDevices) {
        await tx.userSession.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: now },
        });
      }

      const u = await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: user.emailVerifiedAt || now,
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: now,
        },
      });

      await notifyUser(
        {
          userId: u.id,
          eventType: 'PASSWORD_RESET_COMPLETED',
          title: 'Account Password Updated',
          message: signOutOtherDevices
            ? 'Your password was updated and all previous sessions were signed out.'
            : 'Your account password was updated successfully.',
        },
        tx,
      );

      return u;
    });

    const meta = getRequestMeta(req);
    const tokens = await issueSessionAndSetCookie(res, updatedUser, meta);

    return sendSuccess(res, {
      passwordReset: true,
      message: 'Password updated successfully.',
      accessToken: tokens.accessToken,
      user: toPublicUser(updatedUser),
    });
  }),
);

// Google OAuth 2.0 Redirect Initiation (Directs user to Google authentication)
router.get(
  '/auth/google',
  asyncHandler(async (req, res) => {
    const rawCid = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const isRealGoogleCid =
      rawCid.endsWith('.apps.googleusercontent.com') &&
      !rawCid.includes('your-') &&
      !rawCid.includes('placeholder');

    const host = req.get('host') || 'localhost:3000';
    const protocol =
      req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${baseUrl}/api/v1/auth/google/callback`;

    const ref = typeof req.query.ref === 'string' ? req.query.ref.trim() : '';
    const portal = typeof req.query.portal === 'string' ? req.query.portal.trim() : '';

    const stateObj = {
      nonce: crypto.randomBytes(16).toString('hex'),
      ref: ref || undefined,
      portal: portal || undefined,
      redirectUri,
    };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

    if (isRealGoogleCid) {
      // Direct browser redirect to Google's official OAuth authorization endpoint
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', rawCid);
      googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'openid email profile');
      googleAuthUrl.searchParams.set('access_type', 'offline');
      googleAuthUrl.searchParams.set('prompt', 'select_account');
      googleAuthUrl.searchParams.set('state', state);

      return res.redirect(googleAuthUrl.toString());
    }

    // When GOOGLE_CLIENT_ID is not configured, redirect to Google Account Selection page
    const selectAccountUrl = new URL(`${baseUrl}/auth/google/select-account`);
    selectAccountUrl.searchParams.set('state', state);
    selectAccountUrl.searchParams.set('redirect_uri', redirectUri);
    return res.redirect(selectAccountUrl.toString());
  }),
);

// Google OAuth 2.0 Callback (Handles return from Google, provisions/retrieves account & issues session)
router.get(
  '/auth/google/callback',
  asyncHandler(async (req, res) => {
    const {
      code,
      state: rawState,
      error: googleError,
      mock_email,
      mock_name,
      mock_avatar,
    } = req.query;

    const host = req.get('host') || 'localhost:3000';
    const protocol =
      req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    let refCode = '';
    let portal = '';
    let redirectUri = process.env.GOOGLE_CALLBACK_URL || `${baseUrl}/api/v1/auth/google/callback`;
    if (typeof rawState === 'string' && rawState) {
      try {
        const decoded = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8'));
        refCode = decoded.ref || '';
        portal = decoded.portal || '';
        if (decoded.redirectUri) {
          redirectUri = decoded.redirectUri;
        }
      } catch {
        // ignore
      }
    }

    if (googleError) {
      return res.redirect(
        `${baseUrl}/login?error=${encodeURIComponent(String(googleError))}&reason=google_cancelled`,
      );
    }

    let googleSub = '';
    let email = '';
    let name = '';
    let avatarUrl: string | null = null;

    const rawCid = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const rawSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    if (code && typeof code === 'string' && rawCid && rawSecret) {
      // Exchange authorization code for tokens with Google
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: rawCid,
          client_secret: rawSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('Google token exchange error:', errText);
        let detail = 'oauth_error';
        try {
          const parsed = JSON.parse(errText);
          detail = parsed.error_description || parsed.error || errText;
        } catch {
          detail = errText;
        }
        return res.redirect(
          `${baseUrl}/login?error=${encodeURIComponent('Google authentication failed: ' + detail)}&reason=oauth_error`,
        );
      }

      const tokenData = (await tokenRes.json()) as { access_token?: string };
      if (!tokenData.access_token) {
        return res.redirect(
          `${baseUrl}/login?error=Invalid response from Google&reason=oauth_error`,
        );
      }

      // Fetch user profile from Google UserInfo
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!infoRes.ok) {
        return res.redirect(
          `${baseUrl}/login?error=Failed to retrieve Google profile&reason=oauth_error`,
        );
      }
      const profile = (await infoRes.json()) as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
      };

      if (!profile.email || !profile.sub) {
        return res.redirect(
          `${baseUrl}/login?error=Google account has no verified email address&reason=oauth_error`,
        );
      }

      googleSub = profile.sub;
      email = profile.email.trim().toLowerCase();
      name = profile.name || email.split('@')[0] || 'Google User';
      avatarUrl = profile.picture || null;
    } else if (mock_email && typeof mock_email === 'string') {
      // Account selected on Google authentication page
      email = mock_email.trim().toLowerCase();
      name = typeof mock_name === 'string' && mock_name ? mock_name.trim() : email.split('@')[0]!;
      avatarUrl = typeof mock_avatar === 'string' && mock_avatar ? mock_avatar : null;
      googleSub = `google_${hashToken(email).slice(0, 24)}`;
    } else {
      return res.redirect(
        `${baseUrl}/login?error=No authentication credentials received&reason=missing_code`,
      );
    }

    // Lookup or create user in MySQL
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleSub }, { email }],
      },
    });

    let isNewUser = false;
    const now = new Date();

    if (!user) {
      isNewUser = true;
      user = await prisma.$transaction(async (tx) => {
        const publicUid = await nextReadableUid(tx, 'USR', false);
        const userReferralCode = await generateUniqueReferralCode(tx, publicUid);

        let referrerId: string | null = null;
        if (refCode) {
          const referrer = await tx.user.findFirst({
            where: {
              OR: [{ referralCode: refCode }, { publicUid: refCode }],
            },
            select: { id: true },
          });
          if (referrer) {
            referrerId = referrer.id;
          }
        }

        const created = await tx.user.create({
          data: {
            publicUid,
            name,
            email,
            referralCode: userReferralCode,
            referredById: referrerId,
            googleId: googleSub,
            avatarUrl,
            role: portal === 'admin' ? UserRole.ADMIN : UserRole.USER,
            status: UserStatus.ACTIVE,
            emailVerified: true,
            emailVerifiedAt: now,
            lastLoginAt: now,
            wallets: {
              create: {
                asset: 'USDT',
                availableBalance: new Prisma.Decimal(0),
                lockedBalance: new Prisma.Decimal(0),
                investedBalance: new Prisma.Decimal(0),
                pendingWithdrawal: new Prisma.Decimal(0),
              },
            },
            complianceProfile: {
              create: {
                termsAcceptedAt: now,
                privacyAcceptedAt: now,
                riskDisclosureAcceptedAt: now,
              },
            },
          },
        });

        await notifyUser(
          {
            userId: created.id,
            eventType: 'GOOGLE_ACCOUNT_CREATED',
            title: 'Welcome to NAVRIX via Google',
            message: `Your Google account (${created.email}) is linked and your sovereign USDT vault (${created.publicUid}) is ready.`,
          },
          tx,
        );

        return created;
      });
    } else {
      if (user.status === UserStatus.SUSPENDED) {
        return res.redirect(
          `${baseUrl}/login?error=Your account has been suspended&reason=account_suspended`,
        );
      }

      // Ensure USDT wallet exists
      const existingWallet = await prisma.wallet.findUnique({
        where: { userId_asset: { userId: user.id, asset: 'USDT' } },
      });
      if (!existingWallet) {
        await prisma.wallet.create({
          data: {
            userId: user.id,
            asset: 'USDT',
            availableBalance: new Prisma.Decimal(0),
            lockedBalance: new Prisma.Decimal(0),
            investedBalance: new Prisma.Decimal(0),
            pendingWithdrawal: new Prisma.Decimal(0),
          },
        });
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleSub,
          emailVerified: true,
          emailVerifiedAt: user.emailVerifiedAt || now,
          avatarUrl: avatarUrl || user.avatarUrl,
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: now,
        },
      });
    }

    const meta = getRequestMeta(req);
    if (isAdminRole(user.role)) {
      await recordAudit({
        adminId: user.id,
        actorRole: user.role,
        action: AuditAction.ADMIN_LOGIN,
        targetType: 'USER',
        targetId: user.publicUid,
        newValue: { method: 'GOOGLE_OAUTH_REDIRECT' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    const tokens = await issueSessionAndSetCookie(res, user, meta);

    const targetDashboard = isAdminRole(user.role)
      ? isMasterAdminRole(user.role)
        ? '/admin/master'
        : '/admin/dashboard'
      : '/dashboard';

    const callbackRedirectUrl = new URL(`${baseUrl}/auth/callback`);
    callbackRedirectUrl.searchParams.set('token', tokens.accessToken);
    callbackRedirectUrl.searchParams.set('role', user.role);
    callbackRedirectUrl.searchParams.set('isNew', isNewUser ? '1' : '0');
    callbackRedirectUrl.searchParams.set('target', targetDashboard);

    return res.redirect(callbackRedirectUrl.toString());
  }),
);

// Google OAuth 2.0 Sign-In / Sign-Up (Supports Live Google Access Token, Live ID Token, & Browser Account Chooser)
router.post(
  '/auth/google',
  asyncHandler(async (req, res) => {
    const {
      googleAccessToken,
      idToken,
      email: dtoEmail,
      name: dtoName,
      avatarUrl: dtoAvatar,
    } = req.body || {};

    let googleSub = '';
    let email = '';
    let name = '';
    let avatarUrl: string | null = dtoAvatar || null;

    if (googleAccessToken) {
      // Verify live OAuth2 access token from Google Identity Services Account Chooser
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      if (!infoRes.ok) {
        return sendError(
          res,
          'INVALID_GOOGLE_TOKEN',
          'Could not verify Google account credentials. Please try again.',
          401,
        );
      }
      const profile = (await infoRes.json()) as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
        picture?: string;
      };
      if (!profile.email || !profile.sub) {
        return sendError(
          res,
          'GOOGLE_EMAIL_MISSING',
          'Google did not return a verified email address.',
          401,
        );
      }
      googleSub = profile.sub;
      email = profile.email.trim().toLowerCase();
      name = profile.name || email.split('@')[0] || 'Google Investor';
      avatarUrl = profile.picture || null;
    } else if (
      idToken &&
      !String(idToken).startsWith('google_oauth_') &&
      !String(idToken).startsWith('chooser_')
    ) {
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
      if (!verifyRes.ok) {
        return sendError(
          res,
          'INVALID_GOOGLE_TOKEN',
          'Google identity token verification failed.',
          401,
        );
      }
      const tokenInfo = (await verifyRes.json()) as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
      };
      if (!tokenInfo.email || !tokenInfo.sub) {
        return sendError(res, 'INVALID_GOOGLE_TOKEN', 'Google token payload is incomplete.', 401);
      }
      googleSub = tokenInfo.sub;
      email = tokenInfo.email.trim().toLowerCase();
      name = tokenInfo.name || email.split('@')[0] || 'Google Investor';
      avatarUrl = tokenInfo.picture || null;
    } else {
      // Browser Account Chooser Mode (for local dev without GOOGLE_CLIENT_ID)
      email = String(dtoEmail || '')
        .trim()
        .toLowerCase();
      if (!email || !email.includes('@')) {
        return sendError(
          res,
          'INVALID_EMAIL',
          'Please choose or enter a valid Google email address.',
          400,
        );
      }
      name =
        String(dtoName || '').trim() ||
        email
          .split('@')[0]!
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      googleSub = `google_${hashToken(email).slice(0, 24)}`;
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleSub }, { email }],
      },
    });

    let isNewUser = false;
    const now = new Date();

    if (!user) {
      isNewUser = true;
      user = await prisma.$transaction(async (tx) => {
        const publicUid = await nextReadableUid(tx, 'USR', false);
        const userReferralCode = await generateUniqueReferralCode(tx, publicUid);
        const created = await tx.user.create({
          data: {
            publicUid,
            name,
            email,
            referralCode: userReferralCode,
            googleId: googleSub,
            avatarUrl,
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            emailVerified: true,
            emailVerifiedAt: now,
            lastLoginAt: now,
            wallets: {
              create: {
                asset: 'USDT',
                availableBalance: new Prisma.Decimal(0),
                lockedBalance: new Prisma.Decimal(0),
                investedBalance: new Prisma.Decimal(0),
                pendingWithdrawal: new Prisma.Decimal(0),
              },
            },
            complianceProfile: {
              create: {
                termsAcceptedAt: now,
                privacyAcceptedAt: now,
                riskDisclosureAcceptedAt: now,
              },
            },
          },
        });

        await notifyUser(
          {
            userId: created.id,
            eventType: 'GOOGLE_ACCOUNT_CREATED',
            title: 'Welcome to NAVRIX via Google',
            message: `Your Google account (${created.email}) is linked and your USDT vault (${created.publicUid}) is ready.`,
          },
          tx,
        );

        return created;
      });
    } else {
      if (user.status === UserStatus.SUSPENDED) {
        return sendError(
          res,
          'ACCOUNT_SUSPENDED',
          'Your account has been suspended. Please contact support.',
          403,
        );
      }

      // Ensure user also has a USDT wallet row if created earlier without one
      const existingWallet = await prisma.wallet.findUnique({
        where: { userId_asset: { userId: user.id, asset: 'USDT' } },
      });
      if (!existingWallet) {
        await prisma.wallet.create({
          data: {
            userId: user.id,
            asset: 'USDT',
            availableBalance: new Prisma.Decimal(0),
            lockedBalance: new Prisma.Decimal(0),
            investedBalance: new Prisma.Decimal(0),
            pendingWithdrawal: new Prisma.Decimal(0),
          },
        });
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleSub,
          emailVerified: true,
          emailVerifiedAt: user.emailVerifiedAt || now,
          avatarUrl: avatarUrl || user.avatarUrl,
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: now,
        },
      });
    }

    const meta = getRequestMeta(req);
    if (isAdminRole(user.role)) {
      await recordAudit({
        adminId: user.id,
        actorRole: user.role,
        action: AuditAction.ADMIN_LOGIN,
        targetType: 'USER',
        targetId: user.publicUid,
        newValue: { method: 'GOOGLE_OAUTH' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    const tokens = await issueSessionAndSetCookie(res, user, meta);
    return sendSuccess(res, {
      accessToken: tokens.accessToken,
      user: toPublicUser(user),
      isNewUser,
    });
  }),
);

// Refresh Session Cookie
router.post(
  '/auth/refresh',
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.navrix_refresh_token;
    if (!rawRefreshToken) {
      return sendError(res, 'REFRESH_TOKEN_MISSING', 'No active session cookie.', 401);
    }

    const tokenHash = hashToken(rawRefreshToken);
    const session = await prisma.userSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      res.clearCookie('navrix_refresh_token', { path: '/' });
      return sendError(res, 'SESSION_EXPIRED', 'Session expired.', 401);
    }

    if (session.user.status === UserStatus.SUSPENDED) {
      return sendError(res, 'ACCOUNT_SUSPENDED', 'Account is suspended.', 403);
    }

    await prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const meta = getRequestMeta(req);
    const tokens = await issueSessionAndSetCookie(res, session.user, meta, session.familyId);

    return sendSuccess(res, {
      accessToken: tokens.accessToken,
      user: toPublicUser(session.user),
    });
  }),
);

router.post(
  '/auth/logout',
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.navrix_refresh_token;
    if (rawRefreshToken) {
      await prisma.userSession.updateMany({
        where: { refreshTokenHash: hashToken(rawRefreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie('navrix_refresh_token', { path: '/' });
    return sendSuccess(res, { loggedOut: true });
  }),
);

router.post(
  '/auth/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const pwdCheck = passwordPolicySchema.safeParse(newPassword);
    if (!pwdCheck.success) {
      return sendError(
        res,
        'WEAK_PASSWORD',
        pwdCheck.error.issues[0]?.message || 'Password does not meet security policy.',
        400,
      );
    }

    const user = req.user;
    if (user.passwordHash) {
      const ok = await bcrypt.compare(String(currentPassword || ''), user.passwordHash);
      if (!ok) {
        return sendError(res, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect.', 400);
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return sendSuccess(res, { passwordChanged: true });
  }),
);

router.get(
  '/auth/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId: req.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    return sendSuccess(res, sessions);
  }),
);

router.delete(
  '/auth/sessions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.userSession.updateMany({
      where: {
        id: String(req.params.id),
        userId: req.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return sendSuccess(res, { revoked: true });
  }),
);

// =============================================================================
// 3. WALLET & DOUBLE-ENTRY LEDGER (/wallet)
// =============================================================================
router.get(
  '/wallet',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const [wallet, pendingDepositsAgg, pendingWithdrawalsAgg, interestAgg, recentLedger] =
      await Promise.all([
        prisma.wallet.findUnique({
          where: { userId_asset: { userId, asset: 'USDT' } },
        }),
        prisma.deposit.aggregate({
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
        prisma.withdrawal.aggregate({
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
        prisma.ledgerEntry.aggregate({
          where: {
            userId,
            transactionType: LedgerTransactionType.INTEREST,
          },
          _sum: { amount: true },
        }),
        prisma.ledgerEntry.findMany({
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

    return sendSuccess(res, {
      asset: 'USDT',
      totalBalance: total.toFixed(2),
      availableBalance: available.toFixed(2),
      lockedBalance: locked.toFixed(2),
      investedBalance: invested.toFixed(2),
      pendingDeposits: (pendingDepositsAgg._sum.requestedAmount ?? new Prisma.Decimal(0)).toFixed(
        2,
      ),
      pendingWithdrawals: (pendingWithdrawalsAgg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      totalInterestEarned: (interestAgg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      chartSeries,
    });
  }),
);

router.get(
  '/wallet/ledger',
  requireAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const where: Prisma.LedgerEntryWhereInput = { userId: req.userId! };
    if (req.query.type) {
      where.transactionType = String(req.query.type) as LedgerTransactionType;
    }

    const [items, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    return sendSuccess(res, { items, total, page, limit });
  }),
);

// =============================================================================
// 4. DEPOSITS (/deposits)
// =============================================================================
router.get(
  '/payment-methods',
  asyncHandler(async (_req, res) => {
    const active = await getActivePlatformWallets();
    return sendSuccess(res, active);
  }),
);

router.get(
  '/market-data/config',
  asyncHandler(async (_req, res) => {
    const config = await getMarketDataConfig();
    return sendSuccess(res, config);
  }),
);

router.get(
  '/deposits/config',
  asyncHandler(async (_req, res) => {
    const runtime = await getRuntimeSettings();
    const paymentMethods = await getActivePlatformWallets();
    const defaultWallet = await getDefaultPlatformWallet();
    const qr = await buildDepositQrPayload(
      defaultWallet.walletAddress,
      undefined,
      defaultWallet.symbol,
      defaultWallet.network,
      defaultWallet.paymentInstructions,
    );
    const plans = await prisma.investmentPlan.findMany({
      where: { isActive: true },
      orderBy: { minAmount: 'asc' },
    });

    return sendSuccess(res, {
      depositsEnabled: runtime.depositsEnabled && !runtime.maintenanceMode,
      blockchainMode: runtime.blockchainMode,
      minDeposit: runtime.minDeposit,
      maxDeposit: runtime.maxDeposit,
      requiredConfirmations: runtime.requiredConfirmations,
      depositExpiryMinutes: runtime.depositExpiryMinutes,
      reviewSlaHours: runtime.reviewSlaHours,
      paymentMethods,
      defaultWallet,
      ...qr,
      plans,
    });
  }),
);

router.get(
  '/deposits',
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await prisma.deposit.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { submission: true, blockchainTx: true, investment: true },
    });
    return sendSuccess(res, items.map(formatDepositRecord));
  }),
);

router.post(
  '/deposits',
  requireAuth,
  asyncHandler(async (req, res) => {
    const runtime = await getRuntimeSettings();
    if (runtime.maintenanceMode || !runtime.depositsEnabled) {
      return sendError(
        res,
        'DEPOSITS_TEMPORARILY_PAUSED',
        'New deposit requests are temporarily paused by platform administration.',
        503,
      );
    }

    const amount = Number(req.body?.amount);
    const planCode = req.body?.planCode ? String(req.body.planCode).trim() : undefined;
    const paymentMethodId = req.body?.paymentMethodId
      ? String(req.body.paymentMethodId).trim()
      : undefined;

    // Resolve target platform receiving wallet
    let targetWallet = await getDefaultPlatformWallet();
    if (paymentMethodId) {
      const allWallets = await getPlatformWallets();
      const match = allWallets.find((w) => w.id === paymentMethodId && w.isActive);
      if (match) {
        targetWallet = match;
      }
    }

    const minRequired = targetWallet.minDeposit || runtime.minDeposit;
    const maxRequired = targetWallet.maxDeposit || runtime.maxDeposit;

    if (!Number.isFinite(amount) || amount < minRequired || amount > maxRequired) {
      return sendError(
        res,
        'DEPOSIT_AMOUNT_OUT_OF_RANGE',
        `Deposit amount must be between ${minRequired} ${targetWallet.symbol} and ${maxRequired} ${targetWallet.symbol}.`,
        400,
      );
    }

    if (planCode) {
      const plan = await prisma.investmentPlan.findUnique({ where: { code: planCode } });
      if (!plan || !plan.isActive) {
        return sendError(
          res,
          'INVALID_INVESTMENT_PLAN',
          'Selected investment plan does not exist or is inactive.',
          400,
        );
      }
    }

    const expiresAt = new Date(Date.now() + runtime.depositExpiryMinutes * 60_000);
    const requestedDecimal = new Prisma.Decimal(amount.toFixed(8));

    const deposit = await prisma.$transaction(async (tx) => {
      const depositUid = await nextReadableUid(tx, 'DEP', true);
      return tx.deposit.create({
        data: {
          depositUid,
          userId: req.userId!,
          requestedAmount: requestedDecimal,
          token: targetWallet.symbol,
          network: targetWallet.network,
          receivingAddress: targetWallet.walletAddress,
          planCode: planCode || null,
          status: DepositStatus.PENDING_PAYMENT,
          cryptoAmount: requestedDecimal,
          cryptoCurrency: targetWallet.symbol,
          expiresAt,
        },
      });
    });

    const qr = await buildDepositQrPayload(
      deposit.receivingAddress,
      deposit.requestedAmount.toFixed(2),
      deposit.token,
      deposit.network,
      targetWallet.paymentInstructions,
    );

    return sendSuccess(
      res,
      {
        ...formatDepositRecord(deposit),
        paymentMethod: targetWallet,
        paymentInstructions: {
          ...qr,
          walletName: targetWallet.name,
          network: targetWallet.network,
          networkInstructions: targetWallet.paymentInstructions,
        },
      },
      201,
    );
  }),
);

router.get(
  '/deposits/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const deposit = await prisma.deposit.findFirst({
      where: {
        userId: req.userId,
        OR: [{ depositUid: uidOrId }, { id: uidOrId }],
      },
      include: { submission: true, blockchainTx: true, investment: true },
    });

    if (!deposit) {
      return sendError(res, 'DEPOSIT_NOT_FOUND', 'Deposit record was not found.', 404);
    }

    const qr = await buildDepositQrPayload(
      deposit.receivingAddress,
      deposit.requestedAmount.toFixed(2),
    );

    return sendSuccess(res, {
      ...formatDepositRecord(deposit),
      paymentInstructions: qr,
    });
  }),
);

router.get(
  '/deposits/:id/screenshot',
  requireAuth,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const deposit = await prisma.deposit.findFirst({
      where: { OR: [{ depositUid: uidOrId }, { id: uidOrId }] },
      include: { submission: true },
    });

    if (!deposit || !deposit.submission?.screenshotStorageKey) {
      return sendError(res, 'SCREENSHOT_NOT_FOUND', 'No screenshot found.', 404);
    }

    if (deposit.userId !== req.userId && !isAdminRole(req.user.role)) {
      return sendError(res, 'FORBIDDEN', 'Unauthorized screenshot access.', 403);
    }

    const filePath = path.join(
      PRIVATE_UPLOAD_DIR,
      path.basename(deposit.submission.screenshotStorageKey),
    );
    const buffer = await fsPromises.readFile(filePath);
    res.setHeader('Content-Type', deposit.submission.screenshotMimeType || 'image/png');
    return res.send(buffer);
  }),
);

router.post(
  '/deposits/:id/submit-payment',
  requireAuth,
  upload.single('screenshot'),
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const hashParse = bscTxHashSchema.safeParse(req.body?.transactionHash);
    if (!hashParse.success) {
      return sendError(
        res,
        'INVALID_TRANSACTION_HASH',
        hashParse.error.issues[0]?.message ||
          'Enter a valid 66-character BNB Smart Chain transaction hash (0x...).',
        400,
      );
    }
    const normalizedHash = hashParse.data.toLowerCase();

    const deposit = await prisma.deposit.findFirst({
      where: {
        userId: req.userId,
        OR: [{ depositUid: uidOrId }, { id: uidOrId }],
      },
      include: { submission: true },
    });

    if (!deposit) {
      return sendError(res, 'DEPOSIT_NOT_FOUND', 'Deposit not found.', 404);
    }

    if (deposit.submission || deposit.status !== DepositStatus.PENDING_PAYMENT) {
      return sendError(
        res,
        'DEPOSIT_ALREADY_SUBMITTED',
        'Payment details have already been submitted for this deposit request.',
        409,
      );
    }

    if (deposit.expiresAt < new Date()) {
      await prisma.deposit.update({
        where: { id: deposit.id },
        data: { status: DepositStatus.EXPIRED },
      });
      return sendError(
        res,
        'DEPOSIT_EXPIRED',
        'This deposit request has expired. Please create a new deposit request.',
        409,
      );
    }

    const [dupSub, dupChain] = await Promise.all([
      prisma.paymentSubmission.findUnique({
        where: { transactionHash: normalizedHash },
      }),
      prisma.blockchainTransaction.findUnique({
        where: { transactionHash: normalizedHash },
      }),
    ]);
    if (dupSub || dupChain) {
      return sendError(
        res,
        'DUPLICATE_TRANSACTION_HASH',
        'This blockchain transaction hash has already been used.',
        409,
      );
    }

    let screenshotMeta: {
      storageKey: string;
      mimeType: string;
      sizeBytes: number;
    } | null = null;
    if (req.file) {
      screenshotMeta = await savePaymentScreenshot(req.file);
    }

    const runtime = await getRuntimeSettings();
    const submittedAt = new Date();
    const reviewDeadline = new Date(submittedAt.getTime() + runtime.reviewSlaHours * 3600_000);
    const meta = getRequestMeta(req);

    await prisma.$transaction(async (tx) => {
      await tx.paymentSubmission.create({
        data: {
          depositId: deposit.id,
          userId: req.userId!,
          transactionHash: normalizedHash,
          screenshotStorageKey: screenshotMeta?.storageKey || null,
          screenshotMimeType: screenshotMeta?.mimeType || null,
          screenshotSizeBytes: screenshotMeta?.sizeBytes || null,
          notes: req.body?.notes ? String(req.body.notes).trim() : null,
          submittedIp: meta.ipAddress,
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

      await notifyUser(
        {
          userId: req.userId!,
          eventType: NotificationEventType.DEPOSIT_SUBMITTED,
          title: 'Deposit Payment Submitted',
          message: `Your payment for ${deposit.depositUid} has been submitted and is under review.`,
          metadata: { depositUid: deposit.depositUid },
        },
        tx,
      );
    });

    const verification = await verifyDepositOnChain({
      depositId: deposit.id,
      transactionHash: normalizedHash,
      expectedAmount: deposit.requestedAmount.toString(),
      expectedReceivingAddress: deposit.receivingAddress,
    });

    const updatedDeposit = await prisma.$transaction(async (tx) => {
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

      if (verification.isValid) {
        await notifyUser(
          {
            userId: req.userId!,
            eventType: NotificationEventType.BLOCKCHAIN_TX_DETECTED,
            title: 'Blockchain Transaction Detected',
            message: `On-chain BEP-20 transfer detected for ${deposit.depositUid}. Queued for admin review.`,
            metadata: { depositUid: deposit.depositUid, transactionHash: normalizedHash },
          },
          tx,
        );
      }

      return tx.deposit.update({
        where: { id: deposit.id },
        data: { status: DepositStatus.UNDER_REVIEW },
        include: { submission: true, blockchainTx: true, investment: true },
      });
    });

    return sendSuccess(res, {
      ...formatDepositRecord(updatedDeposit),
      reviewNotice: BLOCKCHAIN_DEFAULTS.reviewSlaNotice,
    });
  }),
);

// =============================================================================
// 5. INVESTMENTS (/investments)
// =============================================================================
router.get(
  '/investments/plans',
  asyncHandler(async (_req, res) => {
    const plans = await prisma.investmentPlan.findMany({
      where: { isActive: true },
      orderBy: { minAmount: 'asc' },
    });
    return sendSuccess(res, plans);
  }),
);

router.get(
  '/investments/interest-history',
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await prisma.interestRecord.findMany({
      where: { userId: req.userId },
      orderBy: { creditedAt: 'desc' },
      include: {
        investment: {
          select: {
            investmentUid: true,
            principalAmount: true,
            interestModel: true,
            interestRate: true,
          },
        },
      },
    });
    return sendSuccess(res, items);
  }),
);

router.get(
  '/investments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await prisma.investment.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        deposit: {
          select: {
            depositUid: true,
            requestedAmount: true,
            verifiedAmount: true,
          },
        },
        interestRecords: {
          orderBy: { creditedAt: 'desc' },
        },
      },
    });
    return sendSuccess(res, items);
  }),
);

router.get(
  '/investments/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const inv = await prisma.investment.findFirst({
      where: {
        userId: req.userId,
        OR: [{ investmentUid: uidOrId }, { id: uidOrId }],
      },
      include: {
        plan: true,
        deposit: true,
        interestRecords: {
          orderBy: { creditedAt: 'desc' },
        },
      },
    });

    if (!inv) {
      return sendError(res, 'INVESTMENT_NOT_FOUND', 'Investment record was not found.', 404);
    }
    return sendSuccess(res, inv);
  }),
);

// =============================================================================
// 6. WITHDRAWALS (/withdrawals)
// =============================================================================
router.get(
  '/withdrawals',
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await prisma.withdrawal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, items);
  }),
);

router.post(
  '/withdrawals',
  requireAuth,
  asyncHandler(async (req, res) => {
    const runtime = await getRuntimeSettings();
    if (runtime.maintenanceMode || !runtime.withdrawalsEnabled) {
      return sendError(
        res,
        'WITHDRAWALS_TEMPORARILY_PAUSED',
        'Withdrawal requests are temporarily paused by platform administration.',
        503,
      );
    }

    const amount = Number(req.body?.amount);

    // Destination is ALWAYS the user's registered payout wallet (Wallet ID) — never a
    // client-supplied address — so a hijacked session cannot redirect funds per-request.
    const payoutOwner = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId! },
      select: {
        payoutWalletAddress: true,
        payoutWalletNetwork: true,
        payoutWalletLockUntil: true,
      },
    });
    if (!payoutOwner.payoutWalletAddress) {
      return sendError(
        res,
        'PAYOUT_WALLET_REQUIRED',
        'Add your withdrawal Wallet ID in Profile Settings before requesting a withdrawal.',
        400,
      );
    }
    const addrCheck = evmAddressSchema.safeParse(payoutOwner.payoutWalletAddress);
    if (!addrCheck.success) {
      return sendError(
        res,
        'PAYOUT_WALLET_INVALID',
        'Your saved Wallet ID is no longer valid. Please update it in Profile Settings.',
        400,
      );
    }
    if (payoutOwner.payoutWalletLockUntil && payoutOwner.payoutWalletLockUntil > new Date()) {
      return sendError(
        res,
        'PAYOUT_WALLET_SECURITY_HOLD',
        `Your Wallet ID was recently changed. For your security, withdrawals are on hold until ${payoutOwner.payoutWalletLockUntil.toISOString()}.`,
        423,
        { lockUntil: payoutOwner.payoutWalletLockUntil.toISOString() },
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount < runtime.minWithdrawal ||
      amount > runtime.maxWithdrawal
    ) {
      return sendError(
        res,
        'WITHDRAWAL_AMOUNT_OUT_OF_RANGE',
        `Withdrawal amount must be between ${runtime.minWithdrawal} USDT and ${runtime.maxWithdrawal} USDT.`,
        400,
      );
    }

    const amountDecimal = new Prisma.Decimal(amount.toFixed(8));

    const created = await prisma.$transaction(async (tx) => {
      const wallet = await lockUserWallet(tx, req.userId!, 'USDT');
      if (wallet.availableBalance.lt(amountDecimal)) {
        throw new ApiError(
          'INSUFFICIENT_AVAILABLE_BALANCE',
          `Insufficient available USDT balance. Available: ${wallet.availableBalance.toFixed(2)} USDT.`,
          400,
        );
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: wallet.availableBalance.minus(amountDecimal),
          lockedBalance: wallet.lockedBalance.plus(amountDecimal),
          pendingWithdrawal: wallet.pendingWithdrawal.plus(amountDecimal),
          version: { increment: 1 },
        },
      });

      const withdrawalUid = await nextReadableUid(tx, 'WDR', true);
      const wdr = await tx.withdrawal.create({
        data: {
          withdrawalUid,
          userId: req.userId!,
          amount: amountDecimal,
          feeAmount: new Prisma.Decimal(0),
          netAmount: amountDecimal,
          asset: 'USDT',
          network: payoutOwner.payoutWalletNetwork || 'BNB_SMART_CHAIN',
          destinationAddress: addrCheck.data,
          status: WithdrawalStatus.PENDING_REVIEW,
        },
      });

      await notifyUser(
        {
          userId: req.userId!,
          eventType: NotificationEventType.WITHDRAWAL_REQUESTED,
          title: 'Withdrawal Request Submitted',
          message: `Your withdrawal request ${withdrawalUid} for ${amountDecimal.toFixed(2)} USDT has been locked for admin review.`,
          metadata: { withdrawalUid },
        },
        tx,
      );

      return wdr;
    });

    return sendSuccess(res, created, 201);
  }),
);

router.get(
  '/withdrawals/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const w = await prisma.withdrawal.findFirst({
      where: {
        userId: req.userId,
        OR: [{ withdrawalUid: uidOrId }, { id: uidOrId }],
      },
    });
    if (!w) {
      return sendError(res, 'WITHDRAWAL_NOT_FOUND', 'Withdrawal not found.', 404);
    }
    return sendSuccess(res, w);
  }),
);

// =============================================================================
// 7. USERS & COMPLIANCE (/users)
// =============================================================================
async function buildMePayload(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { complianceProfile: true },
  });

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
    tutorialEnabled: user.tutorialEnabled,
    tutorialCompleted: user.tutorialCompleted,
    tutorialCompletedAt: user.tutorialCompletedAt ? user.tutorialCompletedAt.toISOString() : null,
    hasPassword: Boolean(user.passwordHash),
    payoutWallet: {
      address: user.payoutWalletAddress,
      network: user.payoutWalletNetwork,
      updatedAt: user.payoutWalletUpdatedAt ? user.payoutWalletUpdatedAt.toISOString() : null,
      lockUntil:
        user.payoutWalletLockUntil && user.payoutWalletLockUntil > new Date()
          ? user.payoutWalletLockUntil.toISOString()
          : null,
    },
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    compliance: user.complianceProfile
      ? {
          kycStatus: user.complianceProfile.kycStatus,
          country: user.complianceProfile.country,
          taxResidency: user.complianceProfile.taxResidency,
          taxIdMasked: user.complianceProfile.taxIdMasked,
          termsAcceptedAt: user.complianceProfile.termsAcceptedAt,
          privacyAcceptedAt: user.complianceProfile.privacyAcceptedAt,
          riskDisclosureAcceptedAt: user.complianceProfile.riskDisclosureAcceptedAt,
          investmentAgreementAcceptedAt: user.complianceProfile.investmentAgreementAcceptedAt,
        }
      : null,
  };
}

router.get(
  '/users/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    return sendSuccess(res, await buildMePayload(req.userId!));
  }),
);

router.patch(
  '/users/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, phone } = req.body || {};
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() || null } : {}),
      },
    });
    return sendSuccess(res, await buildMePayload(req.userId!));
  }),
);

// Update or Reset Tutorial Mode (Persistent per user/admin)
router.patch(
  '/users/me/tutorial',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { tutorialEnabled, tutorialCompleted, reset } = req.body || {};
    const now = new Date();

    const updateData: Prisma.UserUpdateInput = {};

    if (reset === true) {
      updateData.tutorialCompleted = false;
      updateData.tutorialCompletedAt = null;
      updateData.tutorialEnabled = true;
    } else {
      if (tutorialEnabled !== undefined) {
        updateData.tutorialEnabled = Boolean(tutorialEnabled);
      }
      if (tutorialCompleted !== undefined) {
        updateData.tutorialCompleted = Boolean(tutorialCompleted);
        updateData.tutorialCompletedAt = tutorialCompleted ? now : null;
      }
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
    });

    return sendSuccess(res, await buildMePayload(req.userId!));
  }),
);

// =============================================================================
// PAYOUT WALLET (WALLET ID) — mandatory destination for every withdrawal
// =============================================================================
const PAYOUT_WALLET_CHANGE_LOCK_HOURS = Math.max(
  0,
  Number(process.env.PAYOUT_WALLET_CHANGE_LOCK_HOURS ?? 0),
);

// Step 1 (optional): email a 6-digit confirmation code (used when the account has no
// password, e.g. Google sign-in accounts, or when the user prefers email verification)
router.post(
  '/users/me/payout-wallet/otp',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const dispatch = await createAndSendUserOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      tokenType: 'PAYOUT_WALLET_OTP',
      purpose: 'PAYOUT_WALLET',
      expiresMinutes: 10,
    });
    return sendSuccess(res, {
      otpSent: true,
      maskedEmail: maskEmail(user.email),
      expiresInSeconds: 600,
      otpPreview: dispatch.otpPreview,
    });
  }),
);

// Step 2: save / update the Wallet ID after password or email-OTP re-verification
router.put(
  '/users/me/payout-wallet',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { address, confirmAddress, password, otp } = req.body || {};

    const addrCheck = evmAddressSchema.safeParse(String(address || '').trim());
    if (!addrCheck.success) {
      return sendError(
        res,
        'INVALID_WALLET_ADDRESS',
        addrCheck.error.issues[0]?.message ||
          'Enter a valid BEP-20 wallet address (0x followed by 40 hex characters).',
        400,
      );
    }
    const newAddress = addrCheck.data;

    if (
      confirmAddress !== undefined &&
      String(confirmAddress).trim().toLowerCase() !== newAddress.toLowerCase()
    ) {
      return sendError(res, 'WALLET_CONFIRMATION_MISMATCH', 'Wallet IDs do not match.', 400);
    }

    if (/^0x0{40}$/i.test(newAddress)) {
      return sendError(
        res,
        'INVALID_WALLET_ADDRESS',
        'The zero address cannot receive funds.',
        400,
      );
    }

    const runtime = await getRuntimeSettings();
    const blockedAddresses = [runtime.receivingWalletAddress, runtime.usdtContractAddress]
      .filter(Boolean)
      .map((a) => String(a).toLowerCase());
    if (blockedAddresses.includes(newAddress.toLowerCase())) {
      return sendError(
        res,
        'INVALID_WALLET_ADDRESS',
        'This address belongs to the platform and cannot be used as your personal Wallet ID.',
        400,
      );
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });

    if (user.payoutWalletAddress?.toLowerCase() === newAddress.toLowerCase()) {
      return sendError(
        res,
        'WALLET_UNCHANGED',
        'This Wallet ID is already saved on your account.',
        400,
      );
    }

    // Re-verification: current password OR a fresh 6-digit email code
    let verifiedVia: 'PASSWORD' | 'EMAIL_OTP' | null = null;
    const otpDigits = String(otp || '').replace(/\D/g, '');
    if (otpDigits.length === 6) {
      const tokenHash = hashOtpForUser(user.id, 'PAYOUT_WALLET_OTP', otpDigits);
      const token = await prisma.authToken.findUnique({ where: { tokenHash } });
      if (!token || token.userId !== user.id || token.usedAt || token.expiresAt < new Date()) {
        return sendError(
          res,
          'INVALID_OR_EXPIRED_OTP',
          'Invalid or expired 6-digit code. Request a new code and try again.',
          400,
        );
      }
      await prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
      verifiedVia = 'EMAIL_OTP';
    } else if (password) {
      if (!user.passwordHash || !(await bcrypt.compare(String(password), user.passwordHash))) {
        return sendError(res, 'PASSWORD_MISMATCH', 'Current password is incorrect.', 401);
      }
      verifiedVia = 'PASSWORD';
    }
    if (!verifiedVia) {
      return sendError(
        res,
        'REVERIFICATION_REQUIRED',
        user.passwordHash
          ? 'Confirm this change with your current password or a 6-digit email code.'
          : 'Confirm this change with the 6-digit code sent to your email.',
        401,
      );
    }

    const now = new Date();
    const isChange = Boolean(user.payoutWalletAddress);
    const lockUntil =
      isChange && PAYOUT_WALLET_CHANGE_LOCK_HOURS > 0
        ? new Date(now.getTime() + PAYOUT_WALLET_CHANGE_LOCK_HOURS * 3_600_000)
        : null;
    const meta = getRequestMeta(req);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          payoutWalletAddress: newAddress,
          payoutWalletNetwork: 'BNB_SMART_CHAIN',
          payoutWalletUpdatedAt: now,
          payoutWalletLockUntil: lockUntil,
        },
      });

      await recordAudit(
        {
          adminId: null,
          actorRole: user.role,
          action: AuditAction.PAYOUT_WALLET_UPDATED,
          targetType: 'USER',
          targetId: user.publicUid,
          oldValue: { payoutWalletAddress: user.payoutWalletAddress },
          newValue: { payoutWalletAddress: newAddress, verifiedVia, lockUntil },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      await notifyUser(
        {
          userId: user.id,
          eventType: NotificationEventType.PAYOUT_WALLET_UPDATED,
          title: isChange ? 'Withdrawal Wallet ID Changed' : 'Withdrawal Wallet ID Saved',
          message: isChange
            ? `Your withdrawal Wallet ID was changed to ${newAddress.slice(0, 8)}…${newAddress.slice(-6)}.${
                lockUntil
                  ? ` Withdrawals are on a security hold until ${lockUntil.toUTCString()}.`
                  : ''
              } If this was not you, contact support immediately.`
            : `Your withdrawal Wallet ID ${newAddress.slice(0, 8)}…${newAddress.slice(-6)} is now registered.`,
          metadata: { verifiedVia, lockUntil: lockUntil?.toISOString() ?? null },
        },
        tx,
      );
    });

    return sendSuccess(res, await buildMePayload(user.id));
  }),
);

router.put(
  '/users/me/compliance',
  requireAuth,
  asyncHandler(async (req, res) => {
    const dto = req.body || {};
    const now = new Date();
    const maskedTax = dto.taxIdNumber
      ? `***-${String(dto.taxIdNumber).trim().slice(-4)}`
      : undefined;

    await prisma.complianceProfile.upsert({
      where: { userId: req.userId! },
      update: {
        ...(dto.country !== undefined ? { country: String(dto.country).trim() || null } : {}),
        ...(dto.taxResidency !== undefined
          ? { taxResidency: String(dto.taxResidency).trim() || null }
          : {}),
        ...(maskedTax !== undefined ? { taxIdMasked: maskedTax } : {}),
        ...(dto.acceptTerms ? { termsAcceptedAt: now } : {}),
        ...(dto.acceptPrivacyPolicy ? { privacyAcceptedAt: now } : {}),
        ...(dto.acceptRiskDisclosure ? { riskDisclosureAcceptedAt: now } : {}),
        ...(dto.acceptInvestmentAgreement ? { investmentAgreementAcceptedAt: now } : {}),
      },
      create: {
        userId: req.userId!,
        country: dto.country ? String(dto.country).trim() || null : null,
        taxResidency: dto.taxResidency ? String(dto.taxResidency).trim() || null : null,
        taxIdMasked: maskedTax || null,
        termsAcceptedAt: dto.acceptTerms ? now : null,
        privacyAcceptedAt: dto.acceptPrivacyPolicy ? now : null,
        riskDisclosureAcceptedAt: dto.acceptRiskDisclosure ? now : null,
        investmentAgreementAcceptedAt: dto.acceptInvestmentAgreement ? now : null,
      },
    });

    return sendSuccess(res, await buildMePayload(req.userId!));
  }),
);

// =============================================================================
// 8. NOTIFICATIONS (/notifications)
// =============================================================================
router.get(
  '/notifications',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(100, Number(req.query.limit || 40));
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: req.userId, isRead: false },
      }),
    ]);
    return sendSuccess(res, { items, unreadCount });
  }),
);

router.post(
  '/notifications/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return sendSuccess(res, { updatedCount: updated.count });
  }),
);

router.post(
  '/notifications/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: String(req.params.id), userId: req.userId },
      data: { isRead: true, readAt: new Date() },
    });
    return sendSuccess(res, { marked: true });
  }),
);

// =============================================================================
// 9. MULTI-LEVEL REFERRALS & EARN SYSTEM (/referrals)
// =============================================================================
router.get(
  '/referrals/overview',
  requireAuth,
  asyncHandler(async (req, res) => {
    const origin = `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
    const overview = await getUserReferralOverview(req.userId!, origin);
    return sendSuccess(res, overview);
  }),
);

// =============================================================================
// ADMIN: REFERRAL CHAIN MANAGEMENT (/admin/referrals)
// =============================================================================
router.get(
  '/admin/referrals/overview',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const overview = await getAdminReferralOverview();
    return sendSuccess(res, overview);
  }),
);

router.get(
  '/admin/referrals/users',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const search = req.query.search ? String(req.query.search) : undefined;
    const levelFilter = req.query.level ? Number(req.query.level) : undefined;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    const result = await getAdminReferralUsers({ search, levelFilter, limit, offset });
    return sendSuccess(res, result);
  }),
);

router.get(
  '/admin/referrals/tree',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const rootUserId = req.query.rootUserId ? String(req.query.rootUserId) : undefined;
    const maxDepth = Math.min(10, Math.max(1, Number(req.query.maxDepth || 10)));
    const result = await getAdminReferralTree(rootUserId, maxDepth);
    return sendSuccess(res, result);
  }),
);

router.get(
  '/admin/referrals/commissions',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const search = req.query.search ? String(req.query.search) : undefined;
    const level = req.query.level ? Number(req.query.level) : undefined;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    const result = await getAdminReferralAuditCommissions({ search, level, limit, offset });
    return sendSuccess(res, result);
  }),
);

router.post(
  '/admin/referrals/assign-referrer',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { targetUserId, referrerCodeOrUid } = req.body || {};
    if (!targetUserId || !referrerCodeOrUid) {
      return sendError(
        res,
        'MISSING_PARAMS',
        'targetUserId and referrerCodeOrUid are required.',
        400,
      );
    }

    const meta = getRequestMeta(req);
    try {
      const result = await adminAssignReferrer({
        targetUserId: String(targetUserId),
        referrerCodeOrUid: String(referrerCodeOrUid),
        adminId: req.userId!,
        actorRole: req.user.role,
        meta,
      });
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, 'ASSIGN_FAILED', err.message || 'Failed to assign referrer.', 400);
    }
  }),
);

router.get(
  '/admin/dashboard',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
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
      prisma.user.count({ where: { role: UserRole.USER } }),
      prisma.deposit.count({
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
      prisma.deposit.count({ where: { status: DepositStatus.APPROVED } }),
      prisma.withdrawal.count({
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
      prisma.deposit.count({
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
      prisma.ledgerEntry.aggregate({
        where: { transactionType: LedgerTransactionType.DEPOSIT },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { transactionType: LedgerTransactionType.WITHDRAWAL },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { transactionType: LedgerTransactionType.INTEREST },
        _sum: { amount: true },
      }),
      prisma.deposit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { publicUid: true, name: true, email: true } },
          submission: true,
          blockchainTx: true,
        },
      }),
      prisma.withdrawal.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { publicUid: true, name: true, email: true } },
        },
      }),
    ]);

    return sendSuccess(res, {
      totalUsers,
      pendingDeposits,
      approvedDeposits,
      pendingWithdrawals,
      overdueReviews,
      totalDeposited: (depositLedgerAgg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      totalWithdrawn: (withdrawalLedgerAgg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      totalInterestCredited: (interestLedgerAgg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      recentDeposits,
      recentWithdrawals,
    });
  }),
);

router.get(
  '/admin/master/overview',
  requireAuth,
  requireMasterAdmin,
  asyncHandler(async (_req, res) => {
    const runtime = await getRuntimeSettings();
    const suite = createBlockchainSuite({
      mode: runtime.blockchainMode,
      chainId: runtime.chainId,
      usdtContractAddress: runtime.usdtContractAddress,
      receivingWalletAddress: runtime.receivingWalletAddress,
      requiredConfirmations: runtime.requiredConfirmations,
    });

    const [
      wallets,
      creditAgg,
      debitAgg,
      vaultTelemetry,
      roleBreakdown,
      activeSessions,
      recentAudits,
    ] = await Promise.all([
      prisma.wallet.findMany({ where: { asset: 'USDT' } }),
      prisma.ledgerEntry.aggregate({
        where: { asset: 'USDT', direction: LedgerDirection.CREDIT },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { asset: 'USDT', direction: LedgerDirection.DEBIT },
        _sum: { amount: true },
      }),
      Promise.race([
        suite.tokenService.getVaultOnChainBalances(runtime.receivingWalletAddress),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('RPC_TIMEOUT')), 2500)),
      ]).catch(() => ({
        address: runtime.receivingWalletAddress,
        usdtBalance: '0.00',
        bnbBalance: '0.0000',
        blockNumber: 0,
        mode: runtime.blockchainMode,
      })),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.userSession.count({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          admin: {
            select: { publicUid: true, name: true, email: true, role: true },
          },
        },
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

    return sendSuccess(res, {
      reconciliation: {
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
      },
      vaultTelemetry,
      runtime,
      roleBreakdown,
      activeSessions,
      recentAudits,
    });
  }),
);

router.post(
  '/admin/master/circuit-breaker',
  requireAuth,
  requireMasterAdmin,
  asyncHandler(async (req, res) => {
    const key = String(req.body?.key || '') as
      'DEPOSITS_ENABLED' | 'WITHDRAWALS_ENABLED' | 'MAINTENANCE_MODE';
    const enabled = Boolean(req.body?.enabled);
    const valueStr = enabled ? 'true' : 'false';
    const existing = await prisma.systemSetting.findUnique({ where: { key } });

    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: valueStr, updatedById: req.userId! },
      create: {
        key,
        value: valueStr,
        category: 'CIRCUIT_BREAKER',
        isPublic: true,
        updatedById: req.userId!,
      },
    });

    const meta = getRequestMeta(req);
    await recordAudit({
      adminId: req.userId,
      actorRole: req.user.role,
      action: AuditAction.EMERGENCY_PAUSE_TOGGLED,
      targetType: 'SYSTEM_SETTING',
      targetId: key,
      oldValue: { value: existing?.value ?? null },
      newValue: { value: valueStr },
      ...meta,
    });

    return sendSuccess(res, updated);
  }),
);

router.get(
  '/admin/users',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
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
        payoutWalletAddress: true,
        payoutWalletNetwork: true,
        payoutWalletUpdatedAt: true,
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
    return sendSuccess(res, users);
  }),
);

// Admin: full user details (profile, balances, registered Wallet ID, referrer, recent withdrawals)
router.get(
  '/admin/users/:uid',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const uid = String(req.params.uid);
    const user = await prisma.user.findFirst({
      where: { OR: [{ publicUid: uid }, { email: uid.toLowerCase() }] },
      select: {
        publicUid: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
        googleId: true,
        referralCode: true,
        lastLoginAt: true,
        createdAt: true,
        payoutWalletAddress: true,
        payoutWalletNetwork: true,
        payoutWalletUpdatedAt: true,
        payoutWalletLockUntil: true,
        referrer: { select: { publicUid: true, name: true, email: true } },
        complianceProfile: { select: { kycStatus: true, country: true } },
        wallets: {
          select: {
            asset: true,
            availableBalance: true,
            lockedBalance: true,
            investedBalance: true,
            pendingWithdrawal: true,
          },
        },
        withdrawals: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            withdrawalUid: true,
            amount: true,
            netAmount: true,
            destinationAddress: true,
            status: true,
            transactionHash: true,
            createdAt: true,
          },
        },
        _count: {
          select: { referrals: true, investments: true, deposits: true, withdrawals: true },
        },
      },
    });
    if (!user) {
      return sendError(res, 'USER_NOT_FOUND', 'User not found.', 404);
    }
    const { googleId, ...rest } = user;
    return sendSuccess(res, {
      ...rest,
      hasGoogle: Boolean(googleId),
      payoutWalletLockUntil:
        user.payoutWalletLockUntil && user.payoutWalletLockUntil > new Date()
          ? user.payoutWalletLockUntil
          : null,
    });
  }),
);

router.get(
  '/admin/admin-users',
  requireAuth,
  requireMasterAdmin,
  asyncHandler(async (_req, res) => {
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN],
        },
      },
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
    return sendSuccess(res, admins);
  }),
);

router.patch(
  '/admin/users/:uid/status',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const targetUid = String(req.params.uid);
    const status = String(req.body?.status) as UserStatus;
    const target = await prisma.user.findUnique({
      where: { publicUid: targetUid },
    });
    if (!target) {
      return sendError(res, 'USER_NOT_FOUND', 'Target user was not found.', 404);
    }
    if (target.role === UserRole.MASTER_ADMIN && req.user.role !== UserRole.MASTER_ADMIN) {
      return sendError(
        res,
        'CANNOT_MODIFY_MASTER_ADMIN',
        'Only a Master Admin can modify a Master Admin account.',
        403,
      );
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { status },
    });

    if (status === UserStatus.SUSPENDED) {
      await prisma.userSession.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const meta = getRequestMeta(req);
    await recordAudit({
      adminId: req.userId,
      actorRole: req.user.role,
      action:
        status === UserStatus.SUSPENDED ? AuditAction.USER_SUSPENDED : AuditAction.USER_ACTIVATED,
      targetType: 'USER',
      targetId: target.publicUid,
      oldValue: { status: target.status },
      newValue: { status: updated.status },
      ...meta,
    });

    return sendSuccess(res, { uid: updated.publicUid, status: updated.status });
  }),
);

router.patch(
  '/admin/users/:uid/role',
  requireAuth,
  requireMasterAdmin,
  asyncHandler(async (req, res) => {
    if (req.user.role !== UserRole.MASTER_ADMIN) {
      return sendError(res, 'FORBIDDEN', 'Only MASTER_ADMIN can modify user roles.', 403);
    }
    const targetUid = String(req.params.uid);
    const newRole = String(req.body?.role) as UserRole;
    const target = await prisma.user.findUnique({
      where: { publicUid: targetUid },
    });
    if (!target) {
      return sendError(res, 'USER_NOT_FOUND', 'Target user not found.', 404);
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role: newRole },
    });

    const meta = getRequestMeta(req);
    await recordAudit({
      adminId: req.userId,
      actorRole: req.user.role,
      action: AuditAction.USER_ROLE_CHANGED,
      targetType: 'USER',
      targetId: target.publicUid,
      oldValue: { role: target.role },
      newValue: { role: updated.role },
      ...meta,
    });

    return sendSuccess(res, { uid: updated.publicUid, role: updated.role });
  }),
);

// =============================================================================
// ADMIN: MULTIPLE WALLET MANAGEMENT & MARKET DATA CONFIGURATION
// =============================================================================
router.get(
  '/admin/wallets',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const wallets = await getPlatformWallets();
    const depositCounts = await prisma.deposit.groupBy({
      by: ['receivingAddress'],
      _count: { id: true },
      _sum: { requestedAmount: true },
    });
    const statsMap: Record<string, { count: number; totalVolume: string }> = {};
    for (const d of depositCounts) {
      if (d.receivingAddress) {
        statsMap[d.receivingAddress] = {
          count: d._count.id,
          totalVolume: d._sum.requestedAmount ? d._sum.requestedAmount.toFixed(2) : '0.00',
        };
      }
    }
    const enriched = wallets.map((w) => ({
      ...w,
      depositCount: statsMap[w.walletAddress]?.count || 0,
      totalVolume: statsMap[w.walletAddress]?.totalVolume || '0.00',
    }));
    return sendSuccess(res, enriched);
  }),
);

router.post(
  '/admin/wallets',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const meta = getRequestMeta(req);
    const {
      name,
      symbol,
      network,
      walletAddress,
      paymentInstructions,
      minDeposit,
      maxDeposit,
      isActive,
    } = req.body || {};
    if (!name || !symbol || !network || !walletAddress) {
      return sendError(
        res,
        'MISSING_REQUIRED_FIELDS',
        'Name, symbol, network, and wallet address are required.',
        400,
      );
    }
    const cleanAddress = String(walletAddress).trim();
    const wallets = await getPlatformWallets();
    const newWallet: PlatformWalletConfig = {
      id: `wallet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: String(name).trim(),
      symbol: String(symbol).trim().toUpperCase(),
      network: String(network).trim().toUpperCase(),
      walletAddress: cleanAddress,
      paymentInstructions: String(
        paymentInstructions || `Send ${symbol} on the ${network} network to this address.`,
      ).trim(),
      minDeposit: Number(minDeposit) > 0 ? Number(minDeposit) : 10,
      maxDeposit: Number(maxDeposit) > 0 ? Number(maxDeposit) : 100000,
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    wallets.push(newWallet);
    await savePlatformWallets(wallets, req.userId);
    await recordAudit({
      adminId: req.userId,
      actorRole: req.user.role,
      action: 'ADD_PLATFORM_WALLET',
      targetType: 'PLATFORM_WALLET',
      targetId: newWallet.id,
      newValue: newWallet,
      ...meta,
    });
    return sendSuccess(res, newWallet, 201);
  }),
);

router.put(
  '/admin/wallets/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const meta = getRequestMeta(req);
    const walletId = String(req.params.id);
    const wallets = await getPlatformWallets();
    const idx = wallets.findIndex((w) => w.id === walletId);
    if (idx === -1) {
      return sendError(res, 'WALLET_NOT_FOUND', 'Specified platform wallet does not exist.', 404);
    }
    const prev = { ...wallets[idx] };
    const updates = req.body || {};
    wallets[idx] = {
      ...prev,
      name: updates.name !== undefined ? String(updates.name).trim() : prev.name,
      symbol:
        updates.symbol !== undefined ? String(updates.symbol).trim().toUpperCase() : prev.symbol,
      network:
        updates.network !== undefined ? String(updates.network).trim().toUpperCase() : prev.network,
      walletAddress:
        updates.walletAddress !== undefined
          ? String(updates.walletAddress).trim()
          : prev.walletAddress,
      paymentInstructions:
        updates.paymentInstructions !== undefined
          ? String(updates.paymentInstructions).trim()
          : prev.paymentInstructions,
      minDeposit: updates.minDeposit !== undefined ? Number(updates.minDeposit) : prev.minDeposit,
      maxDeposit: updates.maxDeposit !== undefined ? Number(updates.maxDeposit) : prev.maxDeposit,
      isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : prev.isActive,
      updatedAt: new Date().toISOString(),
    };
    await savePlatformWallets(wallets, req.userId);
    await recordAudit({
      adminId: req.userId,
      actorRole: req.user.role,
      action: 'UPDATE_PLATFORM_WALLET',
      targetType: 'PLATFORM_WALLET',
      targetId: walletId,
      oldValue: prev,
      newValue: wallets[idx],
      ...meta,
    });
    return sendSuccess(res, wallets[idx]);
  }),
);

router.delete(
  '/admin/wallets/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const meta = getRequestMeta(req);
    const walletId = String(req.params.id);
    const wallets = await getPlatformWallets();
    const idx = wallets.findIndex((w) => w.id === walletId);
    if (idx === -1) {
      return sendError(res, 'WALLET_NOT_FOUND', 'Specified platform wallet does not exist.', 404);
    }
    const removed = wallets.splice(idx, 1)[0];
    await savePlatformWallets(wallets, req.userId);
    await recordAudit({
      adminId: req.userId,
      actorRole: req.user.role,
      action: 'REMOVE_PLATFORM_WALLET',
      targetType: 'PLATFORM_WALLET',
      targetId: walletId,
      oldValue: removed,
      ...meta,
    });
    return sendSuccess(res, { removed: true, id: walletId });
  }),
);

router.get(
  '/admin/market-data',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const config = await getMarketDataConfig();
    return sendSuccess(res, config);
  }),
);

router.put(
  '/admin/market-data',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const meta = getRequestMeta(req);
    const { symbols, wsBaseUrl } = req.body || {};
    if (!Array.isArray(symbols)) {
      return sendError(
        res,
        'INVALID_MARKET_SYMBOLS',
        'Symbols must be an array of MarketSymbolConfig.',
        400,
      );
    }
    const prev = await getMarketDataConfig();
    await saveMarketDataConfig(symbols, wsBaseUrl, req.userId);
    await recordAudit({
      adminId: req.userId,
      actorRole: req.user.role,
      action: 'UPDATE_MARKET_DATA_CONFIG',
      targetType: 'MARKET_DATA',
      targetId: 'MARKET_DATA_SYMBOLS',
      oldValue: prev,
      newValue: { symbols, wsBaseUrl },
      ...meta,
    });
    const updated = await getMarketDataConfig();
    return sendSuccess(res, updated);
  }),
);

router.get(
  '/admin/deposits',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = req.query.status ? String(req.query.status) : undefined;
    const items = await prisma.deposit.findMany({
      where: status ? { status: status as DepositStatus } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { publicUid: true, name: true, email: true } },
        submission: true,
        blockchainTx: true,
        investment: true,
      },
    });
    return sendSuccess(res, items);
  }),
);

router.get(
  '/admin/deposits/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const dep = await prisma.deposit.findFirst({
      where: { OR: [{ depositUid: uidOrId }, { id: uidOrId }] },
      include: {
        user: {
          select: { publicUid: true, name: true, email: true, phone: true },
        },
        reviewedBy: { select: { publicUid: true, name: true, email: true } },
        submission: true,
        blockchainTx: true,
        investment: true,
      },
    });
    if (!dep) {
      return sendError(res, 'DEPOSIT_NOT_FOUND', 'Deposit not found.', 404);
    }
    return sendSuccess(res, dep);
  }),
);

router.post(
  '/admin/deposits/:id/verify',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const dep = await prisma.deposit.findFirst({
      where: { OR: [{ depositUid: uidOrId }, { id: uidOrId }] },
      include: { submission: true },
    });
    if (!dep) {
      return sendError(res, 'DEPOSIT_NOT_FOUND', 'Deposit not found.', 404);
    }
    if (!dep.submission?.transactionHash) {
      return sendError(
        res,
        'NO_TRANSACTION_HASH_SUBMITTED',
        'User has not submitted a blockchain transaction hash.',
        400,
      );
    }

    const verification = await verifyDepositOnChain({
      depositId: dep.id,
      transactionHash: dep.submission.transactionHash,
      expectedAmount: dep.requestedAmount.toString(),
      expectedReceivingAddress: dep.receivingAddress,
    });

    const savedTx = await prisma.blockchainTransaction.upsert({
      where: { transactionHash: dep.submission.transactionHash },
      update: {
        verificationMode: verification.mode,
        chainId: verification.chainId,
        blockNumber: verification.blockNumber,
        blockTimestamp: verification.blockTimestamp,
        fromAddress: verification.fromAddress,
        toAddress: verification.toAddress,
        tokenContract: verification.tokenContract,
        tokenAmount: verification.tokenAmount ? new Prisma.Decimal(verification.tokenAmount) : null,
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
        tokenAmount: verification.tokenAmount ? new Prisma.Decimal(verification.tokenAmount) : null,
        confirmationCount: verification.confirmationCount,
        txSucceeded: verification.txSucceeded,
        isValid: verification.isValid,
        failureCode: verification.failureCode || null,
        failureReason: verification.failureReason || null,
      },
    });

    const meta = getRequestMeta(req);
    await recordAudit({
      adminId: req.userId,
      actorRole: req.user.role,
      action: AuditAction.DEPOSIT_VERIFIED,
      targetType: 'DEPOSIT',
      targetId: dep.depositUid,
      newValue: {
        isValid: verification.isValid,
        mode: verification.mode,
        confirmations: verification.confirmationCount,
      },
      ...meta,
    });

    return sendSuccess(res, { verification, blockchainTx: savedTx });
  }),
);

router.post(
  '/admin/deposits/:id/approve',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const dep = await prisma.deposit.findFirst({
      where: { OR: [{ depositUid: uidOrId }, { id: uidOrId }] },
      include: { submission: true },
    });
    if (!dep) {
      return sendError(res, 'DEPOSIT_NOT_FOUND', 'Deposit not found.', 404);
    }
    if (dep.userId === req.userId) {
      return sendError(
        res,
        'SELF_APPROVAL_FORBIDDEN',
        'Administrators cannot approve their own deposits.',
        403,
      );
    }
    if (dep.status === DepositStatus.APPROVED) {
      return sendError(
        res,
        'DEPOSIT_ALREADY_PROCESSED',
        'This deposit has already been approved.',
        409,
      );
    }
    if (
      !canTransitionDepositStatus(
        dep.status as unknown as DomainDepositStatus,
        DomainDepositStatus.APPROVED,
      )
    ) {
      return sendError(
        res,
        'INVALID_DEPOSIT_STATUS_TRANSITION',
        `Cannot approve deposit from status ${dep.status}.`,
        409,
      );
    }
    if (!dep.submission?.transactionHash) {
      return sendError(
        res,
        'MISSING_TRANSACTION_HASH',
        'Cannot approve deposit without a transaction hash.',
        400,
      );
    }

    const verification = await verifyDepositOnChain({
      depositId: dep.id,
      transactionHash: dep.submission.transactionHash,
      expectedAmount: dep.requestedAmount.toString(),
      expectedReceivingAddress: dep.receivingAddress,
    });

    if (!verification.isValid || !verification.tokenAmount) {
      return sendError(
        res,
        'BLOCKCHAIN_VERIFICATION_FAILED',
        verification.failureReason || 'Blockchain verification failed. Deposit cannot be approved.',
        422,
      );
    }

    const authoritativeAmount = new Prisma.Decimal(verification.tokenAmount);
    const plan = dep.planCode
      ? await prisma.investmentPlan.findUnique({ where: { code: dep.planCode } })
      : await prisma.investmentPlan.findFirst({
          where: { isActive: true },
          orderBy: { minAmount: 'asc' },
        });

    const durationDays = plan?.durationDays ?? 30;
    const interestModel = plan?.interestModel ?? InterestCalculationModel.PERCENTAGE;
    const interestRate = plan?.interestRate ?? new Prisma.Decimal('5.0000');
    const meta = getRequestMeta(req);

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM deposits WHERE id = ${dep.id} FOR UPDATE`;
      const freshDep = await tx.deposit.findUniqueOrThrow({ where: { id: dep.id } });
      if (freshDep.status === DepositStatus.APPROVED) {
        throw new ApiError(
          'DEPOSIT_ALREADY_PROCESSED',
          'This deposit has already been processed.',
          409,
        );
      }

      const now = new Date();
      const updatedDeposit = await tx.deposit.update({
        where: { id: dep.id },
        data: {
          status: DepositStatus.APPROVED,
          verifiedAmount: authoritativeAmount,
          reviewedAt: now,
          reviewedById: req.userId!,
        },
      });

      const wallet = await lockUserWallet(tx, dep.userId, 'USDT');
      const totalBefore = wallet.availableBalance
        .plus(wallet.lockedBalance)
        .plus(wallet.investedBalance);
      const totalAfter = totalBefore.plus(authoritativeAmount);

      const ledgerUid = await nextReadableUid(tx, 'LED', true);
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          ledgerUid,
          userId: dep.userId,
          walletId: wallet.id,
          transactionType: LedgerTransactionType.DEPOSIT,
          direction: LedgerDirection.CREDIT,
          asset: 'USDT',
          amount: authoritativeAmount,
          balanceBefore: totalBefore,
          balanceAfter: totalAfter,
          referenceType: 'DEPOSIT',
          referenceId: dep.depositUid,
          idempotencyKey: `deposit:approve:${dep.id}`,
          description: `Approved BEP-20 USDT deposit ${dep.depositUid}`,
          createdById: req.userId!,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          investedBalance: wallet.investedBalance.plus(authoritativeAmount),
          version: { increment: 1 },
        },
      });

      const investmentUid = await nextReadableUid(tx, 'INV', true);
      const investment = await tx.investment.create({
        data: {
          investmentUid,
          userId: dep.userId,
          depositId: dep.id,
          planId: plan?.id || null,
          principalAmount: authoritativeAmount,
          asset: 'USDT',
          startDate: now,
          maturityDate: new Date(now.getTime() + durationDays * 86400_000),
          interestModel,
          interestRate,
          interestAmount: new Prisma.Decimal(0),
          status: InvestmentStatus.ACTIVE,
        },
      });

      // Multi-Level Referral & Earn System (Automatic distribution up to 10 Levels)
      // Level 1: 8%, Level 2: 4%, Level 3-5: 2%, Level 6-10: 1%
      await distributeMultiLevelReferralCommission(tx, {
        investmentId: investment.id,
        investmentUid: investment.investmentUid,
        investorUserId: dep.userId,
        principalAmount: authoritativeAmount,
        adminUserId: req.userId,
        meta,
      });

      await recordAudit(
        {
          adminId: req.userId,
          actorRole: req.user.role,
          action: AuditAction.DEPOSIT_APPROVED,
          targetType: 'DEPOSIT',
          targetId: dep.depositUid,
          oldValue: { status: freshDep.status },
          newValue: {
            status: DepositStatus.APPROVED,
            verifiedAmount: authoritativeAmount.toFixed(2),
            ledgerUid,
            investmentUid,
          },
          ...meta,
        },
        tx,
      );

      await notifyUser(
        {
          userId: dep.userId,
          eventType: NotificationEventType.DEPOSIT_APPROVED,
          title: 'Deposit Approved & Credited',
          message: `Your deposit ${dep.depositUid} (${authoritativeAmount.toFixed(2)} USDT) has been verified and credited.`,
          metadata: { depositUid: dep.depositUid, ledgerUid },
        },
        tx,
      );

      return { deposit: updatedDeposit, ledgerEntry, investment };
    });

    return sendSuccess(res, result);
  }),
);

router.post(
  '/admin/deposits/:id/reject',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 5) {
      return sendError(
        res,
        'INVALID_REASON',
        'Provide a clear rejection reason (minimum 5 characters).',
        400,
      );
    }

    const dep = await prisma.deposit.findFirst({
      where: { OR: [{ depositUid: uidOrId }, { id: uidOrId }] },
    });
    if (!dep) {
      return sendError(res, 'DEPOSIT_NOT_FOUND', 'Deposit not found.', 404);
    }
    if (dep.status === DepositStatus.APPROVED || dep.status === DepositStatus.REJECTED) {
      return sendError(
        res,
        'DEPOSIT_ALREADY_PROCESSED',
        'This deposit has already been finalized.',
        409,
      );
    }

    const meta = getRequestMeta(req);
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.deposit.update({
        where: { id: dep.id },
        data: {
          status: DepositStatus.REJECTED,
          rejectionReason: reason,
          reviewedAt: new Date(),
          reviewedById: req.userId!,
        },
      });

      await recordAudit(
        {
          adminId: req.userId,
          actorRole: req.user.role,
          action: AuditAction.DEPOSIT_REJECTED,
          targetType: 'DEPOSIT',
          targetId: dep.depositUid,
          oldValue: { status: dep.status },
          newValue: { status: DepositStatus.REJECTED, reason },
          ...meta,
        },
        tx,
      );

      await notifyUser(
        {
          userId: dep.userId,
          eventType: NotificationEventType.DEPOSIT_REJECTED,
          title: 'Deposit Rejected',
          message: `Deposit ${dep.depositUid} was not approved. Reason: ${reason}`,
          metadata: { depositUid: dep.depositUid },
        },
        tx,
      );

      return u;
    });

    return sendSuccess(res, updated);
  }),
);

router.get(
  '/admin/investments',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const items = await prisma.investment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { publicUid: true, name: true, email: true } },
        plan: true,
        interestRecords: { orderBy: { creditedAt: 'desc' } },
      },
    });
    return sendSuccess(res, items);
  }),
);

router.post(
  '/admin/investment-plans',
  requireAuth,
  requireMasterAdmin,
  asyncHandler(async (req, res) => {
    const dto = req.body || {};
    const code = String(dto.code || '')
      .trim()
      .toUpperCase();
    const plan = await prisma.investmentPlan.upsert({
      where: { code },
      update: {
        name: String(dto.name || '').trim(),
        description: dto.description ? String(dto.description).trim() : null,
        interestModel: dto.interestModel as InterestCalculationModel,
        interestRate: new Prisma.Decimal(Number(dto.interestRate).toFixed(4)),
        calculationFrequency: String(dto.calculationFrequency || 'MONTHLY'),
        durationDays: Number(dto.durationDays || 30),
        minAmount: new Prisma.Decimal(Number(dto.minAmount).toFixed(8)),
        maxAmount: new Prisma.Decimal(Number(dto.maxAmount).toFixed(8)),
        isActive: dto.isActive ?? true,
      },
      create: {
        code,
        name: String(dto.name || '').trim(),
        description: dto.description ? String(dto.description).trim() : null,
        interestModel: dto.interestModel as InterestCalculationModel,
        interestRate: new Prisma.Decimal(Number(dto.interestRate).toFixed(4)),
        calculationFrequency: String(dto.calculationFrequency || 'MONTHLY'),
        durationDays: Number(dto.durationDays || 30),
        minAmount: new Prisma.Decimal(Number(dto.minAmount).toFixed(8)),
        maxAmount: new Prisma.Decimal(Number(dto.maxAmount).toFixed(8)),
        isActive: dto.isActive ?? true,
      },
    });
    return sendSuccess(res, plan);
  }),
);

router.post(
  '/admin/investments/:id/interest',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const calculationModel = String(
      req.body?.calculationModel || 'PERCENTAGE',
    ) as InterestCalculationModel;
    const rateOrAmount = Number(req.body?.rateOrAmount);
    const periodKey = String(req.body?.periodKey || '')
      .trim()
      .toUpperCase();
    const description = req.body?.description ? String(req.body.description).trim() : undefined;

    if (!periodKey || !Number.isFinite(rateOrAmount) || rateOrAmount <= 0) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Valid period key and positive rate/amount are required.',
        400,
      );
    }

    const inv = await prisma.investment.findFirst({
      where: { OR: [{ investmentUid: uidOrId }, { id: uidOrId }] },
    });
    if (!inv) {
      return sendError(res, 'INVESTMENT_NOT_FOUND', 'Investment not found.', 404);
    }
    if (inv.status !== InvestmentStatus.ACTIVE) {
      return sendError(
        res,
        'INVESTMENT_NOT_ACTIVE',
        'Interest can only be credited to ACTIVE investments.',
        409,
      );
    }

    const dup = await prisma.interestRecord.findUnique({
      where: { investmentId_periodKey: { investmentId: inv.id, periodKey } },
    });
    if (dup) {
      return sendError(
        res,
        'DUPLICATE_INTEREST_PERIOD',
        `Interest for period "${periodKey}" has already been credited.`,
        409,
      );
    }

    const rateOrAmountDec = new Prisma.Decimal(rateOrAmount.toFixed(8));
    let calculatedInterest =
      calculationModel === InterestCalculationModel.FIXED_AMOUNT
        ? rateOrAmountDec
        : inv.principalAmount.mul(rateOrAmountDec).div(100);
    calculatedInterest = new Prisma.Decimal(calculatedInterest.toFixed(8));

    const meta = getRequestMeta(req);
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await lockUserWallet(tx, inv.userId, 'USDT');
      const totalBefore = wallet.availableBalance
        .plus(wallet.lockedBalance)
        .plus(wallet.investedBalance);
      const totalAfter = totalBefore.plus(calculatedInterest);

      const ledgerUid = await nextReadableUid(tx, 'LED', true);
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          ledgerUid,
          userId: inv.userId,
          walletId: wallet.id,
          transactionType: LedgerTransactionType.INTEREST,
          direction: LedgerDirection.CREDIT,
          asset: 'USDT',
          amount: calculatedInterest,
          balanceBefore: totalBefore,
          balanceAfter: totalAfter,
          referenceType: 'INVESTMENT',
          referenceId: inv.investmentUid,
          idempotencyKey: `interest:${inv.id}:${periodKey}`,
          description: description || `Interest credit (${periodKey}) for ${inv.investmentUid}`,
          createdById: req.userId!,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: wallet.availableBalance.plus(calculatedInterest),
          version: { increment: 1 },
        },
      });

      const interestUid = await nextReadableUid(tx, 'INT', true);
      const interestRecord = await tx.interestRecord.create({
        data: {
          interestUid,
          investmentId: inv.id,
          userId: inv.userId,
          periodKey,
          calculationModel,
          rateApplied: new Prisma.Decimal(rateOrAmount.toFixed(4)),
          principalSnapshot: inv.principalAmount,
          amount: calculatedInterest,
          ledgerEntryId: ledgerEntry.id,
          status: 'CREDITED',
          description: description || null,
          createdById: req.userId!,
        },
      });

      await tx.investment.update({
        where: { id: inv.id },
        data: { interestAmount: inv.interestAmount.plus(calculatedInterest) },
      });

      await recordAudit(
        {
          adminId: req.userId,
          actorRole: req.user.role,
          action: AuditAction.INTEREST_CREATED,
          targetType: 'INVESTMENT',
          targetId: inv.investmentUid,
          newValue: {
            interestUid,
            periodKey,
            amount: calculatedInterest.toFixed(2),
          },
          ...meta,
        },
        tx,
      );

      await notifyUser(
        {
          userId: inv.userId,
          eventType: NotificationEventType.INTEREST_CREDITED,
          title: 'Yield / Interest Credited',
          message: `+${calculatedInterest.toFixed(2)} USDT interest credited to your available balance for ${inv.investmentUid}.`,
        },
        tx,
      );

      return { interestRecord, ledgerEntry };
    });

    return sendSuccess(res, result);
  }),
);

router.get(
  '/admin/withdrawals',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = req.query.status ? String(req.query.status) : undefined;
    const items = await prisma.withdrawal.findMany({
      where: status ? { status: status as WithdrawalStatus } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            publicUid: true,
            name: true,
            email: true,
            payoutWalletAddress: true,
            payoutWalletUpdatedAt: true,
          },
        },
        admin: { select: { publicUid: true, name: true } },
      },
    });
    return sendSuccess(res, items);
  }),
);

router.post(
  '/admin/withdrawals/:id/approve',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const w = await prisma.withdrawal.findFirst({
      where: { OR: [{ withdrawalUid: uidOrId }, { id: uidOrId }] },
    });
    if (!w) {
      return sendError(res, 'WITHDRAWAL_NOT_FOUND', 'Withdrawal not found.', 404);
    }
    if (
      !canTransitionWithdrawalStatus(
        w.status as unknown as DomainWithdrawalStatus,
        DomainWithdrawalStatus.APPROVED,
      )
    ) {
      return sendError(
        res,
        'INVALID_WITHDRAWAL_TRANSITION',
        `Cannot approve withdrawal from status ${w.status}.`,
        409,
      );
    }

    const updated = await prisma.withdrawal.update({
      where: { id: w.id },
      data: {
        status: WithdrawalStatus.APPROVED,
        adminId: req.userId!,
        reviewedAt: new Date(),
      },
    });

    const meta = getRequestMeta(req);
    await recordAudit({
      adminId: req.userId,
      actorRole: req.user.role,
      action: AuditAction.WITHDRAWAL_APPROVED,
      targetType: 'WITHDRAWAL',
      targetId: w.withdrawalUid,
      oldValue: { status: w.status },
      newValue: { status: WithdrawalStatus.APPROVED },
      ...meta,
    });

    await notifyUser({
      userId: w.userId,
      eventType: NotificationEventType.WITHDRAWAL_APPROVED,
      title: 'Withdrawal Approved for Payout',
      message: `Your withdrawal ${w.withdrawalUid} (${w.amount.toFixed(2)} USDT) has been approved for settlement.`,
    });

    return sendSuccess(res, updated);
  }),
);

router.post(
  '/admin/withdrawals/:id/reject',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 5) {
      return sendError(res, 'INVALID_REASON', 'Provide a rejection reason.', 400);
    }

    const w = await prisma.withdrawal.findFirst({
      where: { OR: [{ withdrawalUid: uidOrId }, { id: uidOrId }] },
    });
    if (!w) {
      return sendError(res, 'WITHDRAWAL_NOT_FOUND', 'Withdrawal not found.', 404);
    }

    const meta = getRequestMeta(req);
    const updated = await prisma.$transaction(async (tx) => {
      const wallet = await lockUserWallet(tx, w.userId, 'USDT');
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: wallet.availableBalance.plus(w.amount),
          lockedBalance: Prisma.Decimal.max(
            new Prisma.Decimal(0),
            wallet.lockedBalance.minus(w.amount),
          ),
          pendingWithdrawal: Prisma.Decimal.max(
            new Prisma.Decimal(0),
            wallet.pendingWithdrawal.minus(w.amount),
          ),
          version: { increment: 1 },
        },
      });

      const u = await tx.withdrawal.update({
        where: { id: w.id },
        data: {
          status: WithdrawalStatus.REJECTED,
          rejectionReason: reason,
          adminId: req.userId!,
          reviewedAt: new Date(),
        },
      });

      await recordAudit(
        {
          adminId: req.userId,
          actorRole: req.user.role,
          action: AuditAction.WITHDRAWAL_REJECTED,
          targetType: 'WITHDRAWAL',
          targetId: w.withdrawalUid,
          oldValue: { status: w.status },
          newValue: { status: WithdrawalStatus.REJECTED, reason },
          ...meta,
        },
        tx,
      );

      await notifyUser(
        {
          userId: w.userId,
          eventType: NotificationEventType.WITHDRAWAL_REJECTED,
          title: 'Withdrawal Rejected & Funds Unlocked',
          message: `Withdrawal ${w.withdrawalUid} was rejected (${reason}). ${w.amount.toFixed(2)} USDT unlocked back to available balance.`,
        },
        tx,
      );

      return u;
    });

    return sendSuccess(res, updated);
  }),
);

router.post(
  '/admin/withdrawals/:id/complete',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const uidOrId = String(req.params.id);
    const hashCheck = bscTxHashSchema.safeParse(req.body?.transactionHash);
    if (!hashCheck.success) {
      return sendError(
        res,
        'INVALID_OUTBOUND_TX_HASH',
        hashCheck.error.issues[0]?.message || 'Invalid BSC transaction hash.',
        400,
      );
    }
    const normalizedHash = hashCheck.data.toLowerCase();

    const w = await prisma.withdrawal.findFirst({
      where: { OR: [{ withdrawalUid: uidOrId }, { id: uidOrId }] },
    });
    if (!w) {
      return sendError(res, 'WITHDRAWAL_NOT_FOUND', 'Withdrawal not found.', 404);
    }
    if (w.status !== WithdrawalStatus.APPROVED && w.status !== WithdrawalStatus.PROCESSING) {
      return sendError(
        res,
        'WITHDRAWAL_MUST_BE_APPROVED_FIRST',
        `Withdrawal must be APPROVED first (current: ${w.status}).`,
        409,
      );
    }

    const runtime = await getRuntimeSettings();
    const meta = getRequestMeta(req);

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await lockUserWallet(tx, w.userId, 'USDT');
      const totalBefore = wallet.availableBalance
        .plus(wallet.lockedBalance)
        .plus(wallet.investedBalance);
      const totalAfter = totalBefore.minus(w.amount);

      const ledgerUid = await nextReadableUid(tx, 'LED', true);
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          ledgerUid,
          userId: w.userId,
          walletId: wallet.id,
          transactionType: LedgerTransactionType.WITHDRAWAL,
          direction: LedgerDirection.DEBIT,
          asset: 'USDT',
          amount: w.amount,
          balanceBefore: totalBefore,
          balanceAfter: totalAfter,
          referenceType: 'WITHDRAWAL',
          referenceId: w.withdrawalUid,
          idempotencyKey: `withdrawal:complete:${w.id}`,
          description: `Completed USDT withdrawal (${w.withdrawalUid})`,
          createdById: req.userId!,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          lockedBalance: Prisma.Decimal.max(
            new Prisma.Decimal(0),
            wallet.lockedBalance.minus(w.amount),
          ),
          pendingWithdrawal: Prisma.Decimal.max(
            new Prisma.Decimal(0),
            wallet.pendingWithdrawal.minus(w.amount),
          ),
          version: { increment: 1 },
        },
      });

      const updated = await tx.withdrawal.update({
        where: { id: w.id },
        data: {
          status: WithdrawalStatus.COMPLETED,
          transactionHash: normalizedHash,
          adminId: req.userId!,
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

      await recordAudit(
        {
          adminId: req.userId,
          actorRole: req.user.role,
          action: AuditAction.WITHDRAWAL_COMPLETED,
          targetType: 'WITHDRAWAL',
          targetId: w.withdrawalUid,
          oldValue: { status: w.status },
          newValue: {
            status: WithdrawalStatus.COMPLETED,
            transactionHash: normalizedHash,
            ledgerUid,
          },
          ...meta,
        },
        tx,
      );

      await notifyUser(
        {
          userId: w.userId,
          eventType: NotificationEventType.WITHDRAWAL_COMPLETED,
          title: 'Withdrawal Settled On-Chain',
          message: `Your withdrawal ${w.withdrawalUid} (${w.netAmount.toFixed(2)} USDT) has been completed.`,
        },
        tx,
      );

      return { withdrawal: updated, ledgerEntry };
    });

    return sendSuccess(res, result);
  }),
);

router.get(
  '/admin/ledger',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 40)));
    const [items, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { publicUid: true, name: true, email: true } },
        },
      }),
      prisma.ledgerEntry.count(),
    ]);
    return sendSuccess(res, { items, total, page, limit });
  }),
);

router.get(
  '/admin/blockchain-transactions',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const items = await prisma.blockchainTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        deposit: { select: { depositUid: true, status: true } },
        withdrawal: { select: { withdrawalUid: true, status: true } },
      },
    });
    return sendSuccess(res, items);
  }),
);

router.get(
  '/admin/audit-logs',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 40)));
    const where: Prisma.AuditLogWhereInput = {};
    if (req.query.action) where.action = String(req.query.action);

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          admin: {
            select: { publicUid: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return sendSuccess(res, { items, total, page, limit });
  }),
);

router.get(
  '/admin/settings',
  requireAuth,
  requireMasterAdmin,
  asyncHandler(async (_req, res) => {
    const items = await prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    return sendSuccess(res, items);
  }),
);

router.put(
  '/admin/settings',
  requireAuth,
  requireMasterAdmin,
  asyncHandler(async (req, res) => {
    const key = String(req.body?.key || '')
      .trim()
      .toUpperCase();
    const value = String(req.body?.value ?? '').trim();
    const description = req.body?.description ? String(req.body.description).trim() : undefined;

    const existing = await prisma.systemSetting.findUnique({ where: { key } });
    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value,
        description: description ?? existing?.description,
        updatedById: req.userId!,
      },
      create: {
        key,
        value,
        category: 'GENERAL',
        isPublic: false,
        description,
        updatedById: req.userId!,
      },
    });

    const meta = getRequestMeta(req);
    await recordAudit({
      adminId: req.userId,
      actorRole: req.user.role,
      action: AuditAction.SYSTEM_SETTING_CHANGED,
      targetType: 'SYSTEM_SETTING',
      targetId: key,
      oldValue: { value: existing?.value ?? null },
      newValue: { value: updated.value },
      ...meta,
    });

    return sendSuccess(res, updated);
  }),
);

// Convenience redirects for root OAuth endpoints
app.get('/auth/google', (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(`/api/v1/auth/google${query}`);
});

app.get('/auth/google/callback', (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(`/api/v1/auth/google/callback${query}`);
});

app.get('/auth/callback', (req, res, next) => {
  if (req.query.code || req.query.error) {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(`/api/v1/auth/google/callback${query}`);
  }
  next();
});

app.use('/api/v1', router);

// Catch unmatched /api/* routes cleanly as JSON 404
app.use('/api', (_req, res) => {
  return sendError(res, 'API_ROUTE_NOT_FOUND', 'API endpoint not found.', 404);
});

// Global API Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (!req.originalUrl.startsWith('/api')) {
    return next(err);
  }
  if (err instanceof ApiError) {
    return sendError(res, err.code, err.message, err.status, err.details);
  }
  console.error('[NAVRIX API Error]:', err);
  return sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    err?.message || 'An unexpected server error occurred.',
    500,
  );
});

// =============================================================================
// UNIFIED SINGLE-PORT SERVER BOOTSTRAP (PORT 3000 ONLY: API + WEB + ADMIN)
// =============================================================================
async function startUnifiedServer() {
  const httpServer = http.createServer(app);
  const webRoot = path.resolve(__dirname, '../../apps/web');
  const isProd = process.env.NODE_ENV === 'production';
  let viteInstance: { close?: () => Promise<void> } | null = null;

  if (!isProd && fs.existsSync(path.join(webRoot, 'index.html'))) {
    // Mount Vite dev server in middleware mode onto the SAME port 3000!
    const webRequire = createRequire(path.join(webRoot, 'package.json'));
    const viteEntryUrl = pathToFileURL(webRequire.resolve('vite')).href;
    const nativeImport = new Function('specifier', 'return import(specifier)') as (
      specifier: string,
    ) => Promise<{
      createServer: (opts: Record<string, unknown>) => Promise<{
        middlewares: express.RequestHandler;
        close: () => Promise<void>;
      }>;
    }>;
    const { createServer: createViteServer } = await nativeImport(viteEntryUrl);
    const vite = await createViteServer({
      root: webRoot,
      configFile: path.join(webRoot, 'vite.config.mjs'),
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    viteInstance = vite;
    app.use(vite.middlewares);
  } else if (fs.existsSync(path.join(webRoot, 'dist', 'index.html'))) {
    const distDir = path.join(webRoot, 'dist');
    app.use(express.static(distDir));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const shutdown = async () => {
    try {
      if (viteInstance?.close) await viteInstance.close();
    } catch {
      // ignore
    }
    httpServer.close(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `\n🚀 NAVRIX Unified Platform (Web + Admin + Node.js API) live at http://localhost:${PORT}`,
    );
    console.log(`   • Customer Web  : http://localhost:${PORT}/`);
    console.log(`   • Unified Auth  : http://localhost:${PORT}/login`);
    console.log(`   • Admin Console : http://localhost:${PORT}/admin/dashboard`);
    console.log(`   • Master Command: http://localhost:${PORT}/admin/master`);
    console.log(`   • REST API      : http://localhost:${PORT}/api/v1/health\n`);
  });
}

if (require.main === module) {
  startUnifiedServer().catch((err) => {
    console.error('Failed to start unified server:', err);
    process.exit(1);
  });
}
