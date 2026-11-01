export const BRAND_CONFIG = {
  name: 'NAVRIX',
  motto: 'INVEST · TRADE · GROW',
  tagline: 'Institutional Yields. Absolute On-Chain Transparency.',
  subTagline:
    'Non-custodial-verified BEP-20 USDT deposit architecture backed by an immutable double-entry ledger.',
} as const;

export const BLOCKCHAIN_DEFAULTS = {
  networkCode: 'BNB_SMART_CHAIN',
  networkDisplayName: 'BNB Smart Chain (BEP-20)',
  tokenSymbol: 'USDT',
  tokenName: 'Tether USD (BEP-20)',
  tokenDecimals: 18,
  mainnetChainId: 56,
  testnetChainId: 97,
  mainnetUsdtContract: '0x55d398326f99059fF775485246999027B3197955',
  testnetUsdtContract: '0x337610d27c682E347C9cD60BE4b3b107C9d34dDd',
  defaultReceivingAddress: '0x98386622d3937c0A3582E07aEc06041C3fb7b521',
  defaultRequiredConfirmations: 12,
  networkWarning:
    'Only send USDT using BNB Smart Chain (BEP-20). Sending another token or using another network may result in permanent loss.',
  reviewSlaNotice:
    'Your payment has been submitted and is under review. It may take up to 24 hours.',
} as const;

export const COMPLIANCE_DISCLOSURES = {
  regulatoryDisclaimer:
    'Digital asset deposits and yield programs carry market, smart-contract, and operational risks. Platform configuration, KYC/AML thresholds, and regional eligibility require independent legal and compliance review prior to live mainnet deployment. Nothing on this platform constitutes regulated banking, securities brokerage, or guaranteed returns.',
} as const;

