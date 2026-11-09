'use client';

import * as React from 'react';
import { BRAND_CONFIG } from '@navrix/config';
import { LegalDocLayout } from '../../components/marketing/LegalDocLayout';

const TERMS_CLAUSES = [
  {
    id: 'gateway-scope',
    num: '01',
    title: 'Platform Nature & Sovereign Gateway Scope',
    body: `${BRAND_CONFIG.name} Platform provides digital identity orchestration (USR-xxxx), BEP-20 USDT deposit verification, double-entry ledger accounting, and unified ecosystem discovery. ${BRAND_CONFIG.name} does not act as a discretionary fund manager, regulated investment advisor, or fiat depository institution.`,
  },
  {
    id: 'entity-agreements',
    num: '02',
    title: 'Autonomous Ecosystem Entity Terms',
    body: `When engaging with any specialized entity listed in the ${BRAND_CONFIG.name} Marketplace—spanning systematic trading, autonomous hedge models, hybrid capital vaults, funded prop challenges, or educational academies—your participation is governed by the specific operational rules, fee schedules, and lock-up terms of that respective entity.`,
  },
  {
    id: 'account-security',
    num: '03',
    title: 'Account Integrity, Eligibility & KYC Compliance',
    body: `Participants must be of legal age in their jurisdiction and ensure that accessing digital asset infrastructure complies with applicable local regulations. You are responsible for safeguarding your account credentials, OTP verification codes, and withdrawal wallet addresses.`,
  },
  {
    id: 'treasury-ledger',
    num: '04',
    title: 'BEP-20 Treasury Verification & Escrow Withdrawals',
    body: `Inbound USDT deposits require BNB Smart Chain (BEP-20) transaction hash verification and 12-block confirmation finality before ledger crediting within our standard 24-hour review SLA. Outbound withdrawal requests atomically transition funds into an escrow-locked state until on-chain settlement is completed.`,
  },
  {
    id: 'intellectual-property',
    num: '05',
    title: 'Intellectual Property & Acceptable Conduct',
    body: `All software interfaces, S.E.R.P.O. architectural documentation, brand marks, and telemetry visualizations remain the intellectual property of ${BRAND_CONFIG.name} Platform or its respective ecosystem partners. Automated scraping, fraudulent transaction hash submission, or abuse of platform APIs will result in immediate account suspension.`,
  },
  {
    id: 'limitation-liability',
    num: '06',
    title: 'Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, ${BRAND_CONFIG.name} Platform and its infrastructure affiliates disclaim liability for market drawdowns, third-party brokerage latency, blockchain network anomalies, or user-submitted address errors.`,
  },
];

export default function TermsConditionsPage() {
  return (
    <LegalDocLayout
      activeDoc="terms"
      title="Platform Terms & Governance Conditions"
      subtitle={`Contractual framework governing access to the ${BRAND_CONFIG.name} Sovereign Gateway, Investor Command Portal, and Ecosystem Marketplace.`}
      executiveSummary={
        <>
          <strong>Governance Summary:</strong> By registering a {BRAND_CONFIG.name} account or
          interacting with ecosystem interfaces, you acknowledge our non-custodial gateway scope,
          BEP-20 settlement procedures, and independent entity separation standards.
        </>
      }
      clauses={TERMS_CLAUSES}
    />
  );
}
