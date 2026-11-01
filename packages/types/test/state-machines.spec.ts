import { describe, expect, it } from 'vitest';
import {
  canTransitionDepositStatus,
  canTransitionWithdrawalStatus,
  DepositStatus,
  isAdminRole,
  isMasterAdminRole,
  UserRole,
  WithdrawalStatus,
} from '../src';

describe('@navrix/types state machines & RBAC helpers', () => {
  it('enforces valid deposit status transitions and blocks illegal jumps', () => {
    expect(
      canTransitionDepositStatus(
        DepositStatus.PENDING_PAYMENT,
        DepositStatus.PAYMENT_SUBMITTED,
      ),
    ).toBe(true);
    expect(
      canTransitionDepositStatus(
        DepositStatus.PAYMENT_SUBMITTED,
        DepositStatus.BLOCKCHAIN_DETECTED,
      ),
    ).toBe(true);
    expect(
      canTransitionDepositStatus(
        DepositStatus.BLOCKCHAIN_DETECTED,
        DepositStatus.UNDER_REVIEW,
      ),
    ).toBe(true);
    expect(
      canTransitionDepositStatus(
        DepositStatus.UNDER_REVIEW,
        DepositStatus.APPROVED,
      ),
    ).toBe(true);

    // Illegal transitions: cannot jump PENDING_PAYMENT -> APPROVED, nor mutate APPROVED/REJECTED
    expect(
      canTransitionDepositStatus(
        DepositStatus.PENDING_PAYMENT,
        DepositStatus.APPROVED,
      ),
    ).toBe(false);
    expect(
      canTransitionDepositStatus(
        DepositStatus.APPROVED,
        DepositStatus.REJECTED,
      ),
    ).toBe(false);
    expect(
      canTransitionDepositStatus(
        DepositStatus.REJECTED,
        DepositStatus.APPROVED,
      ),
    ).toBe(false);
  });

  it('enforces valid withdrawal status transitions and blocks mutating terminal states', () => {
    expect(
      canTransitionWithdrawalStatus(
        WithdrawalStatus.PENDING_REVIEW,
        WithdrawalStatus.APPROVED,
      ),
    ).toBe(true);
    expect(
      canTransitionWithdrawalStatus(
        WithdrawalStatus.APPROVED,
        WithdrawalStatus.COMPLETED,
      ),
    ).toBe(true);
    expect(
      canTransitionWithdrawalStatus(
        WithdrawalStatus.PENDING_REVIEW,
        WithdrawalStatus.COMPLETED,
      ),
    ).toBe(false);
    expect(
      canTransitionWithdrawalStatus(
        WithdrawalStatus.COMPLETED,
        WithdrawalStatus.REJECTED,
      ),
    ).toBe(false);
  });

  it('classifies RBAC role hierarchy accurately', () => {
    expect(isAdminRole(UserRole.USER)).toBe(false);
    expect(isAdminRole(UserRole.ADMIN)).toBe(true);
    expect(isAdminRole(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isAdminRole(UserRole.MASTER_ADMIN)).toBe(true);

    expect(isMasterAdminRole(UserRole.USER)).toBe(false);
    expect(isMasterAdminRole(UserRole.ADMIN)).toBe(false);
    expect(isMasterAdminRole(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isMasterAdminRole(UserRole.MASTER_ADMIN)).toBe(true);
  });
});

