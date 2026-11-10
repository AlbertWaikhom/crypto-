export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  MASTER_ADMIN = 'MASTER_ADMIN',
}

export const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.USER]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SUPER_ADMIN]: 3,
  [UserRole.MASTER_ADMIN]: 4,
};

export function isAdminRole(role?: string | null): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.MASTER_ADMIN;
}

export function isMasterAdminRole(role?: string | null): boolean {
  return role === UserRole.MASTER_ADMIN || role === UserRole.SUPER_ADMIN;
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum BlockchainMode {
  MOCK = 'MOCK',
  TESTNET = 'TESTNET',
  MAINNET = 'MAINNET',
}

export enum BlockchainNetwork {
  BNB_SMART_CHAIN = 'BNB_SMART_CHAIN',
}

export enum DepositStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_SUBMITTED = 'PAYMENT_SUBMITTED',
  BLOCKCHAIN_DETECTED = 'BLOCKCHAIN_DETECTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Authoritative Deposit State Transition Machine.
 * Arbitrary status transitions are strictly forbidden.
 */
export const DEPOSIT_STATE_TRANSITIONS: Record<DepositStatus, DepositStatus[]> = {
  [DepositStatus.PENDING_PAYMENT]: [
    DepositStatus.PAYMENT_SUBMITTED,
    DepositStatus.EXPIRED,
    DepositStatus.CANCELLED,
  ],
  [DepositStatus.PAYMENT_SUBMITTED]: [
    DepositStatus.BLOCKCHAIN_DETECTED,
    DepositStatus.UNDER_REVIEW,
    DepositStatus.REJECTED,
  ],
  [DepositStatus.BLOCKCHAIN_DETECTED]: [
    DepositStatus.UNDER_REVIEW,
    DepositStatus.APPROVED,
    DepositStatus.REJECTED,
  ],
  [DepositStatus.UNDER_REVIEW]: [
    DepositStatus.BLOCKCHAIN_DETECTED,
    DepositStatus.APPROVED,
    DepositStatus.REJECTED,
  ],
  [DepositStatus.APPROVED]: [],
  [DepositStatus.REJECTED]: [],
  [DepositStatus.EXPIRED]: [],
  [DepositStatus.CANCELLED]: [],
};

export function canTransitionDepositStatus(from: DepositStatus, to: DepositStatus): boolean {
  return DEPOSIT_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

export enum LedgerTransactionType {
  DEPOSIT = 'DEPOSIT',
  INTEREST = 'INTEREST',
  WITHDRAWAL = 'WITHDRAWAL',
  WITHDRAWAL_REVERSAL = 'WITHDRAWAL_REVERSAL',
  ADJUSTMENT = 'ADJUSTMENT',
  FEE = 'FEE',
  REFUND = 'REFUND',
  COMMISSION = 'COMMISSION',
}

export enum InvestmentStatus {
  ACTIVE = 'ACTIVE',
  MATURED = 'MATURED',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export enum InterestCalculationModel {
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  PERCENTAGE = 'PERCENTAGE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  MATURITY = 'MATURITY',
}

export enum WithdrawalStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export const WITHDRAWAL_STATE_TRANSITIONS: Record<WithdrawalStatus, WithdrawalStatus[]> = {
  [WithdrawalStatus.PENDING_REVIEW]: [WithdrawalStatus.APPROVED, WithdrawalStatus.REJECTED],
  [WithdrawalStatus.APPROVED]: [
    WithdrawalStatus.PROCESSING,
    WithdrawalStatus.COMPLETED,
    WithdrawalStatus.REJECTED,
    WithdrawalStatus.FAILED,
  ],
  [WithdrawalStatus.PROCESSING]: [WithdrawalStatus.COMPLETED, WithdrawalStatus.FAILED],
  [WithdrawalStatus.COMPLETED]: [],
  [WithdrawalStatus.REJECTED]: [],
  [WithdrawalStatus.FAILED]: [],
};

export function canTransitionWithdrawalStatus(
  from: WithdrawalStatus,
  to: WithdrawalStatus,
): boolean {
  return WITHDRAWAL_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

export enum AuditAction {
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  MASTER_ADMIN_ACTION = 'MASTER_ADMIN_ACTION',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  DEPOSIT_VERIFIED = 'DEPOSIT_VERIFIED',
  DEPOSIT_APPROVED = 'DEPOSIT_APPROVED',
  DEPOSIT_REJECTED = 'DEPOSIT_REJECTED',
  INTEREST_CREATED = 'INTEREST_CREATED',
  INTEREST_APPROVED = 'INTEREST_APPROVED',
  INVESTMENT_PLAN_UPDATED = 'INVESTMENT_PLAN_UPDATED',
  WITHDRAWAL_APPROVED = 'WITHDRAWAL_APPROVED',
  WITHDRAWAL_REJECTED = 'WITHDRAWAL_REJECTED',
  WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED',
  BALANCE_ADJUSTMENT = 'BALANCE_ADJUSTMENT',
  SYSTEM_SETTING_CHANGED = 'SYSTEM_SETTING_CHANGED',
  EMERGENCY_PAUSE_TOGGLED = 'EMERGENCY_PAUSE_TOGGLED',
  REFERRAL_COMMISSION_DISTRIBUTED = 'REFERRAL_COMMISSION_DISTRIBUTED',
  PAYOUT_WALLET_UPDATED = 'PAYOUT_WALLET_UPDATED',
}

export enum NotificationEventType {
  DEPOSIT_SUBMITTED = 'DEPOSIT_SUBMITTED',
  BLOCKCHAIN_TX_DETECTED = 'BLOCKCHAIN_TX_DETECTED',
  DEPOSIT_APPROVED = 'DEPOSIT_APPROVED',
  DEPOSIT_REJECTED = 'DEPOSIT_REJECTED',
  INVESTMENT_ACTIVATED = 'INVESTMENT_ACTIVATED',
  INTEREST_CREDITED = 'INTEREST_CREDITED',
  WITHDRAWAL_REQUESTED = 'WITHDRAWAL_REQUESTED',
  WITHDRAWAL_APPROVED = 'WITHDRAWAL_APPROVED',
  WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED',
  WITHDRAWAL_REJECTED = 'WITHDRAWAL_REJECTED',
  REFERRAL_COMMISSION_RECEIVED = 'REFERRAL_COMMISSION_RECEIVED',
  PAYOUT_WALLET_UPDATED = 'PAYOUT_WALLET_UPDATED',
}

export enum KycStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    requestId?: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PublicUserDto {
  uid: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  tutorialEnabled?: boolean;
  tutorialCompleted?: boolean;
  tutorialCompletedAt?: string | null;
  createdAt: string;
}

export interface WalletOverviewDto {
  asset: string;
  totalBalance: string;
  availableBalance: string;
  lockedBalance: string;
  investedBalance: string;
  pendingDeposits: string;
  pendingWithdrawals: string;
  totalInterestEarned: string;
}

export interface BlockchainVerificationSummary {
  isValid: boolean;
  mode: BlockchainMode;
  transactionHash: string;
  network: BlockchainNetwork;
  chainId: number;
  blockNumber: string | null;
  blockTimestamp: string | null;
  fromAddress: string | null;
  toAddress: string | null;
  tokenContract: string | null;
  tokenAmount: string | null;
  confirmationCount: number;
  requiredConfirmations: number;
  failureCode?: string;
  failureReason?: string;
}

export const REFERRAL_TIER_RATES: Record<number, number> = {
  1: 0.08, // Level 1 (Direct Referral): 8%
  2: 0.04, // Level 2: 4%
  3: 0.02, // Level 3: 2%
  4: 0.02, // Level 4: 2%
  5: 0.02, // Level 5: 2%
  6: 0.01, // Level 6: 1%
  7: 0.01, // Level 7: 1%
  8: 0.01, // Level 8: 1%
  9: 0.01, // Level 9: 1%
  10: 0.01, // Level 10: 1%
};

export interface ReferralHierarchyNode {
  userId: string;
  publicUid: string;
  name: string;
  emailMasked: string;
  level: number;
  joinedAt: string;
  status: string;
  totalInvested: string;
  activeInvestmentsCount: number;
  totalCommissionGeneratedForYou: string;
  children?: ReferralHierarchyNode[];
}

export interface ReferralLevelBreakdown {
  level: number;
  ratePercent: number;
  rateLabel: string;
  referralsCount: number;
  totalInvestment: string;
  commissionEarned: string;
}

export interface ReferralCommissionItem {
  id: string;
  commissionUid: string;
  level: number;
  ratePercent: string;
  investmentAmount: string;
  commissionAmount: string;
  asset: string;
  status: string;
  createdAt: string;
  investorUid: string;
  investorName: string;
  investmentUid: string;
}

export interface UserReferralOverview {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  directReferrals: number;
  networkReferrals: number;
  activeLevelsCount: number;
  totalEarnedUsdt: string;
  totalNetworkVolumeUsdt: string;
  breakdown: ReferralLevelBreakdown[];
  hierarchy: ReferralHierarchyNode[];
  recentCommissions: ReferralCommissionItem[];
}

export interface AdminReferralChainUser {
  userId: string;
  publicUid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  referralCode: string;
  referredByUid: string | null;
  referredByName: string | null;
  directReferralsCount: number;
  totalDownlineCount: number;
  totalInvested: string;
  totalCommissionsEarned: string;
  totalCommissionsGenerated: string;
  createdAt: string;
}

export interface AdminReferralAuditItem {
  id: string;
  commissionUid: string;
  referrerUid: string;
  referrerName: string;
  investorUid: string;
  investorName: string;
  investmentUid: string;
  level: number;
  ratePercent: string;
  investmentAmount: string;
  commissionAmount: string;
  asset: string;
  status: string;
  createdAt: string;
  ledgerUid?: string | null;
}
