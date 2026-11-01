import { z } from 'zod';
import {
  BlockchainNetwork,
  InterestCalculationModel,
  UserRole,
} from '@navrix/types';

export const BSC_TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
export const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const bscTxHashSchema = z
  .string()
  .trim()
  .refine(
    (val) => !/^https?:\/\//i.test(val),
    'Paste only the 66-character transaction hash (0x...), not a block explorer URL.',
  )
  .refine(
    (val) => BSC_TX_HASH_REGEX.test(val),
    'Invalid BNB Smart Chain transaction hash. Expected 0x followed by 64 hexadecimal characters.',
  );

export const evmAddressSchema = z
  .string()
  .trim()
  .regex(
    EVM_ADDRESS_REGEX,
    'Invalid BEP-20 wallet address. Expected 0x followed by 40 hexadecimal characters.',
  );

export const positiveUsdtAmountSchema = z.coerce
  .number({ invalid_type_error: 'Enter a valid numeric USDT amount.' })
  .positive('Amount must be greater than 0 USDT.')
  .max(10_000_000, 'Amount exceeds maximum single-transaction threshold.')
  .refine(
    (n) => Number.isFinite(n) && Math.round(n * 1e6) / 1e6 === n,
    'Amount supports up to 6 decimal places.',
  );

export const passwordPolicySchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(128, 'Password must not exceed 128 characters.')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must include at least one number.');

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(100, 'Full name cannot exceed 100 characters.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s()-]{7,24}$/, 'Enter a valid phone number.')
    .optional()
    .or(z.literal('')),
  password: passwordPolicySchema,
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms & Risk Disclosure.' }),
  }),
  country: z.string().trim().max(64).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  totpCode: z.string().trim().optional(),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(10, 'Google ID token is required.'),
  email: z.string().email().optional(),
  name: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16, 'Invalid password reset token.'),
  newPassword: passwordPolicySchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordPolicySchema,
});

export const createDepositSchema = z.object({
  amount: positiveUsdtAmountSchema,
  network: z.nativeEnum(BlockchainNetwork).default(BlockchainNetwork.BNB_SMART_CHAIN),
  token: z.literal('USDT').default('USDT'),
  planCode: z.string().trim().max(64).optional(),
});

export const submitPaymentSchema = z.object({
  transactionHash: bscTxHashSchema,
  notes: z.string().trim().max(500).optional(),
});

export const createWithdrawalSchema = z.object({
  amount: positiveUsdtAmountSchema,
  destinationAddress: evmAddressSchema,
  network: z.nativeEnum(BlockchainNetwork).default(BlockchainNetwork.BNB_SMART_CHAIN),
});

export const adminRejectDepositSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Provide a clear rejection reason (minimum 5 characters).')
    .max(500),
});

export const adminCreateInterestSchema = z.object({
  calculationModel: z.nativeEnum(InterestCalculationModel),
  rateOrAmount: z.coerce.number().positive('Rate or fixed amount must be positive.'),
  periodKey: z
    .string()
    .trim()
    .min(3, 'Period key is required (e.g. 2026-11-W1 or 2026-11-01).')
    .max(64),
  description: z.string().trim().max(300).optional(),
});

export const adminCompleteWithdrawalSchema = z.object({
  transactionHash: bscTxHashSchema,
  notes: z.string().trim().max(300).optional(),
});

export const adminRejectWithdrawalSchema = z.object({
  reason: z.string().trim().min(5, 'Provide a rejection reason.').max(500),
});

export const adminSystemSettingSchema = z.object({
  key: z.string().trim().min(2).max(100),
  value: z.string().trim().max(2000),
  description: z.string().trim().max(500).optional(),
});

export const adminRoleUpdateSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export const complianceProfileSchema = z.object({
  country: z.string().trim().min(2).max(80),
  taxResidency: z.string().trim().max(80).optional(),
  taxIdNumber: z.string().trim().max(40).optional(),
  acceptTerms: z.boolean(),
  acceptPrivacyPolicy: z.boolean(),
  acceptRiskDisclosure: z.boolean(),
  acceptInvestmentAgreement: z.boolean(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type CreateDepositInput = z.infer<typeof createDepositSchema>;
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;
export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;
export type AdminCreateInterestInput = z.infer<typeof adminCreateInterestSchema>;
export type ComplianceProfileInput = z.infer<typeof complianceProfileSchema>;
