import { describe, expect, it } from 'vitest';
import { BlockchainNetwork, InterestCalculationModel } from '@navrix/types';
import {
  adminCreateInterestSchema,
  bscTxHashSchema,
  createDepositSchema,
  createWithdrawalSchema,
  evmAddressSchema,
  passwordPolicySchema,
  registerSchema,
  submitPaymentSchema,
} from '../src';

describe('@navrix/validation schemas', () => {
  it('accepts valid 66-character BNB Smart Chain transaction hashes', () => {
    const validHash =
      '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f1234';
    expect(bscTxHashSchema.parse(`  ${validHash}  `)).toBe(validHash);
  });

  it('rejects block explorer URLs submitted as transaction hashes', () => {
    const url =
      'https://bscscan.com/tx/0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f1234';
    const parsed = bscTxHashSchema.safeParse(url);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain('not a block explorer URL');
    }
  });

  it('rejects malformed or short transaction hashes', () => {
    expect(bscTxHashSchema.safeParse('0x12345').success).toBe(false);
    expect(
      bscTxHashSchema.safeParse(
        '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f1234',
      ).success,
    ).toBe(false);
    expect(
      bscTxHashSchema.safeParse(
        '0xZZZZ7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f1234',
      ).success,
    ).toBe(false);
  });

  it('validates BEP-20 EVM wallet addresses including platform receiving wallet', () => {
    const receiving = '0x98386622d3937c0A3582E07aEc06041C3fb7b521';
    expect(evmAddressSchema.parse(receiving)).toBe(receiving);
    expect(evmAddressSchema.safeParse('0x1234').success).toBe(false);
    expect(evmAddressSchema.safeParse('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh').success).toBe(
      false,
    );
  });

  it('enforces strong password policy and terms acceptance during registration', () => {
    expect(passwordPolicySchema.safeParse('weak').success).toBe(false);
    expect(passwordPolicySchema.safeParse('alllowercase123').success).toBe(false);
    expect(passwordPolicySchema.safeParse('ALLUPPERCASE123').success).toBe(false);
    expect(passwordPolicySchema.safeParse('NoNumbersHere').success).toBe(false);
    expect(passwordPolicySchema.safeParse('Navrix2026!').success).toBe(true);

    const reg = registerSchema.safeParse({
      name: 'Alice Investor',
      email: 'ALICE@EXAMPLE.COM',
      password: 'NavrixUser2026!',
      acceptTerms: true,
    });
    expect(reg.success).toBe(true);
    if (reg.success) {
      expect(reg.data.email).toBe('alice@example.com');
    }
  });

  it('validates deposit, payment submission, withdrawal, and interest schemas', () => {
    expect(
      createDepositSchema.parse({
        amount: '100.5',
      }),
    ).toEqual({
      amount: 100.5,
      network: BlockchainNetwork.BNB_SMART_CHAIN,
      token: 'USDT',
    });

    expect(createDepositSchema.safeParse({ amount: -10 }).success).toBe(false);

    expect(
      submitPaymentSchema.safeParse({
        transactionHash:
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef1234',
      }).success,
    ).toBe(true);

    expect(
      createWithdrawalSchema.safeParse({
        amount: 50,
        destinationAddress: '0x98386622d3937c0A3582E07aEc06041C3fb7b521',
      }).success,
    ).toBe(true);

    expect(
      adminCreateInterestSchema.safeParse({
        calculationModel: InterestCalculationModel.PERCENTAGE,
        rateOrAmount: 5,
        periodKey: '2026-11-M1',
      }).success,
    ).toBe(true);
  });
});

