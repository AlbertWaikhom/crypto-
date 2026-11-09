'use client';

import * as React from 'react';
import { BRAND_CONFIG } from '@navrix/config';
import { LegalDocLayout } from '../../components/marketing/LegalDocLayout';

const RISK_CLAUSES = [
  {
    id: 'market-capital-risk',
    num: '01',
    title: 'General Market, Digital Asset & Principal Risk',
    body: `Participation in digital asset transfers, algorithmic trading systems, foreign exchange, commodities, and pooled capital vaults involves substantial risk—including the potential partial or total loss of deployed capital. Historical model telemetry, simulated projections, or prior settlement cycles of any ecosystem entity are never a guarantee of future performance.`,
  },
  {
    id: 'entity-separation',
    num: '02',
    title: 'Independent Entity Ring-Fencing (S.E.R.P.O. Standard)',
    body: `Each company within the ${BRAND_CONFIG.name} ecosystem—Botxp, Tradex0.3, ARB24x5, Novex Portfolio, Volatility Blaze, Funded Master, Stockarth Academy, and Finup Global—operates autonomously. Each entity enforces its own execution venue, drawdown guardrails, lock-up durations, and contractual terms without cross-entity liability commingling. Participants must evaluate each entity independently prior to participation.`,
  },
  {
    id: 'blockchain-bep20',
    num: '03',
    title: 'BNB Smart Chain (BEP-20) & On-Chain Settlement Risks',
    body: `USDT deposits and outbound payouts inside the Investor Portal utilize the BNB Smart Chain (BEP-20, Chain ID 56). Sending unsupported tokens, routing funds across an incompatible network, or entering an inaccurate withdrawal address may result in irreversible on-chain loss. Network congestion or RPC latency can occasionally extend confirmation times beyond standard block intervals.`,
  },
  {
    id: 'algorithmic-execution',
    num: '04',
    title: 'Algorithmic, Bridge & Liquidity Venue Risks',
    body: `Automated and semi-automated models rely on software logic, third-party brokerage bridges (such as MT5), and market-maker liquidity pools. Flash volatility, spread widening, slippage, or venue maintenance windows can materially impact strategy execution despite active circuit breakers.`,
  },
  {
    id: 'non-advisory',
    num: '05',
    title: 'Non-Advisory Status of Intelligence & Academies',
    body: `Market dispatches from Volatility Blaze and educational curricula delivered by Stockarth Academy and Finup Global are provided strictly for analytical and educational purposes. Nothing published across the ${BRAND_CONFIG.name} ecosystem constitutes personalized investment, legal, or tax advice.`,
  },
  {
    id: 'due-diligence',
    num: '06',
    title: 'Participant Eligibility & Independent Due Diligence',
    body: `Before deploying capital, participants should verify jurisdictional eligibility, assess personal risk tolerance, never allocate capital they cannot afford to lose, and consult qualified independent financial or legal advisors where appropriate.`,
  },
];

export default function RiskDisclosurePage() {
  return (
    <LegalDocLayout
      activeDoc="risk"
      title="Mandatory Risk Disclosure Statement"
      subtitle={`Comprehensive structural, market, smart-contract, and operational risk disclosures governing the ${BRAND_CONFIG.name} Platform gateway and its eight independent ecosystem entities.`}
      executiveSummary={
        <>
          <strong>Mandatory Notice:</strong> {BRAND_CONFIG.name} Platform operates strictly as a
          financial technology ecosystem gateway and double-entry ledger coordinator.{' '}
          {BRAND_CONFIG.name} is not a commercial bank, custodian of fiat deposits, or licensed
          securities broker-dealer, and never guarantees fixed or risk-free returns.
        </>
      }
      clauses={RISK_CLAUSES}
    />
  );
}
