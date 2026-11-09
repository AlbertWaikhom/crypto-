'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button, CountUp, GradientText, ShinyText, SpotlightCard } from '@navrix/ui';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader';
import {
  DoubleEntrySolvencyGraphic,
  EcosystemTopologyGraphic,
} from '../../components/marketing/ArchitectureGraphics';
import styles from './about.module.css';

const SERPO_PILLARS = [
  {
    letter: 'S',
    title: 'Strategy Framework',
    short: 'Decoupled quantitative logic per entity',
    headline: 'Zero Single-Model Dependency Across Market Regimes',
    desc: 'Every company in the NAVRIX ecosystem maintains a self-contained quantitative thesis—ranging from semi-automated MT5 momentum (Botxp, Tradex0.3) to 24/5 correlation hedging (ARB24x5) and duration-matched pools (Novex Portfolio).',
    checks: [
      'Independent signal generation & parameter governance',
      'No shared strategy black-box across separate entities',
      'Designed to withstand macroeconomic regime rotations',
    ],
  },
  {
    letter: 'E',
    title: 'Execution Model',
    short: 'Autonomous brokerage bridges & routing',
    headline: 'Dedicated Execution Conduits & Session Stability',
    desc: 'Execution venues, liquidity bridges, and latency thresholds are configured natively by each operating entity to match its order-flow profile—eliminating cross-desk queue congestion.',
    checks: [
      'Institutional MT5 bridges & direct market routing',
      'Zero discretionary trade execution by NAVRIX Gateway',
      '24/5 continuous session telemetry across global hubs',
    ],
  },
  {
    letter: 'R',
    title: 'Risk Structure',
    short: 'Ring-fenced drawdown & escrow caps',
    headline: 'Strict Liability Isolation & Circuit Breakers',
    desc: 'Risk exposure is strictly ring-fenced within each participating model. Drawdowns or volatility events in an aggressive tactical sleeve never spill over into hedge or pooled capital mandates.',
    checks: [
      'Zero cross-entity commingling of liabilities or margin',
      'Entity-level equity circuit breakers & stop governance',
      'Atomic escrow locking on all outbound USDT withdrawals',
    ],
  },
  {
    letter: 'P',
    title: 'Performance Reporting',
    short: 'Append-only double-entry ledger proofs',
    headline: 'Immutable Row-Locked Accounting (0.00000000 Variance)',
    desc: 'Within the NAVRIX Investor Portal, balances are never overwritten in place. Every verified BEP-20 deposit, vault lock, yield accrual, and payout creates an auditable double-entry credit or debit.',
    checks: [
      'Continuous Master Admin wallet-to-ledger reconciliation',
      '66-character BSC transaction hash verification trail',
      'Transparent cycle reporting aligned with each entity model',
    ],
  },
  {
    letter: 'O',
    title: 'Operational Policies',
    short: 'Transparent legal & eligibility boundaries',
    headline: 'Clear Contractual Scope & Participant Due Diligence',
    desc: 'Each ecosystem company publishes independent participation terms, lock-up schedules, and risk disclosures—empowering allocators to evaluate every engine on its own merits.',
    checks: [
      'Explicit separation between infrastructure & capital management',
      'Mandatory risk disclosure visibility prior to onboarding',
      'Dedicated compliance & institutional relations desk',
    ],
  },
];

const EVOLUTION_PHASES = [
  {
    phase: 'PHASE 01',
    title: 'Systematic Execution Foundations',
    period: 'Algorithmic Core',
    summary:
      'Established structured semi-automated and high-performance trading architectures (Botxp & Tradex0.3) built around disciplined MT5 execution and monitored drawdown caps.',
  },
  {
    phase: 'PHASE 02',
    title: 'Autonomous Hedge & Pooled Vaults',
    period: 'Capital Resilience',
    summary:
      'Expanded into 24/5 delta-balanced hedge automation (ARB24x5) and duration-tiered hybrid capital pools (Novex Portfolio) for passive USDT allocators.',
  },
  {
    phase: 'PHASE 03',
    title: 'Funded Talent & Practitioner Academies',
    period: 'Global Reach (25,000+)',
    summary:
      'Integrated meritocratic prop evaluations (Funded Master), real-time macro intelligence (Volatility Blaze), and live cohorts (Stockarth Academy & Finup Global).',
  },
  {
    phase: 'PHASE 04',
    title: 'Unified Sovereign BEP-20 Gateway',
    period: 'Current Architecture',
    summary:
      'Consolidated onboarding, deterministic USR-xxxx BEP-20 USDT deposit routing, and row-locked double-entry MySQL solvency verification under one sovereign portal.',
  },
];

const WHAT_WE_ENABLE = [
  'Unified sovereign identity (USR-xxxx) and BEP-20 USDT deposit verification',
  'Append-only double-entry ledger visibility with 0.00000000 reconciliation variance',
  'Structured discovery across 8 independent trading, hedge, prop, and academy entities',
  'Atomic escrow-locked withdrawal workflows with verified BSC transaction hashes',
  'Standardized S.E.R.P.O. transparency and mandatory risk disclosure frameworks',
];

const WHAT_WE_NEVER_DO = [
  'Directly execute discretionary client trades or commingle cross-entity liabilities',
  'Overwrite wallet balances without an immutable double-entry audit record',
  'Promise fixed, risk-free, or guaranteed investment returns across market regimes',
  'Act as a commercial fiat bank or provide unlicensed personal investment advice',
  'Obscure independent entity terms, lock-up horizons, or drawdown parameters',
];

const PHILOSOPHY_CARDS = [
  {
    num: '01',
    title: 'Regimes Shift Constantly',
    body: 'Global liquidity cycles alternate between directional momentum, range compression, and macro shocks—demanding multi-model adaptability.',
  },
  {
    num: '02',
    title: 'Single Strategies Break',
    body: 'Relying on a single trading algorithm exposes capital to tail-risk vulnerability when market microstructure changes.',
  },
  {
    num: '03',
    title: 'Isolation Builds Longevity',
    body: 'Ring-fencing independent strategy companies prevents operational or risk contagion across uncorrelated sleeves.',
  },
  {
    num: '04',
    title: 'Proof Replaces Trust',
    body: 'Cryptographic BEP-20 transaction hashes and double-entry ledger reconciliation turn solvency into verifiable math.',
  },
];

export default function AboutPage() {
  const [activeSerpoIdx, setActiveSerpoIdx] = React.useState(0);
  const [phaseIdx, setPhaseIdx] = React.useState(3);

  const activeSerpo = SERPO_PILLARS[activeSerpoIdx] || SERPO_PILLARS[0];
  const activePhase = EVOLUTION_PHASES[phaseIdx] || EVOLUTION_PHASES[0];

  return (
    <div className={styles.pageRoot}>
      <SiteHeader mode="sticky" />

      <main className={styles.mainContent}>
        {/* 1. EXECUTIVE HERO WITH TOPOLOGY & SOLVENCY GRAPHICS */}
        <section className={styles.heroSection}>
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <motion.div
                className={styles.heroCopy}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
              >
                <span className={styles.eyebrowPill}>
                  <Sparkles size={13} />
                  <ShinyText text="INSTITUTIONAL ARCHITECTURE & GOVERNANCE" />
                </span>

                <h1 className={styles.pageTitle}>
                  The Sovereign Gateway Behind{' '}
                  <GradientText variant="sovereign">
                    Eight Specialized Financial Ecosystems.
                  </GradientText>
                </h1>

                <p className={styles.pageSubtitle}>
                  We believe the future of digital wealth is not a single strategy—it is an
                  ecosystem of decoupled systems. {BRAND_CONFIG.name} engineers the non-custodial
                  routing, double-entry ledger accounting, and governance standards that connect
                  25,000+ global participants with specialized financial entities.
                </p>

                <div className={styles.kpiStrip}>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiVal}>
                      <CountUp value={25000} decimals={0} />+
                    </div>
                    <div className={styles.kpiLbl}>Global Users</div>
                  </div>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiVal}>8 Entities</div>
                    <div className={styles.kpiLbl}>Autonomous Models</div>
                  </div>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiVal}>60+</div>
                    <div className={styles.kpiLbl}>Jurisdictions</div>
                  </div>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiVal} style={{ color: '#10b981' }}>
                      100%
                    </div>
                    <div className={styles.kpiLbl}>Ledger Solvency</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={styles.heroGraphicsStack}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.08 }}
              >
                <EcosystemTopologyGraphic />
                <DoubleEntrySolvencyGraphic />
              </motion.div>
            </div>
          </div>
        </section>

        {/* 2. INTERACTIVE S.E.R.P.O. GOVERNANCE ARCHITECTURE EXPLORER */}
        <section id="serpo" className={styles.sectionBlockAlt}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <span className={styles.eyebrowPill}>S.E.R.P.O. GOVERNANCE STANDARD</span>
              <h2 className={styles.sectionTitle}>Five Pillars of Operational Separation</h2>
              <p className={styles.sectionSubtitle}>
                Select any pillar of our S.E.R.P.O. framework to inspect how {BRAND_CONFIG.name}{' '}
                enforces strict structural boundaries across every ecosystem company.
              </p>
            </div>

            <div className={styles.serpoExplorer}>
              <div className={styles.serpoTabs} role="tablist">
                {SERPO_PILLARS.map((item, idx) => {
                  const active = idx === activeSerpoIdx;
                  return (
                    <button
                      key={item.letter}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveSerpoIdx(idx)}
                      className={`${styles.serpoTabBtn} ${active ? styles.serpoTabActive : ''}`}
                    >
                      <span className={styles.serpoLetterBadge}>{item.letter}</span>
                      <div>
                        <div className={styles.serpoTabTitle}>{item.title}</div>
                        <div className={styles.serpoTabShort}>{item.short}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSerpo.letter}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                  className={styles.serpoDetailPanel}
                >
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-2">
                      <ShieldCheck size={14} />
                      Pillar {activeSerpo.letter} · {activeSerpo.title}
                    </div>
                    <h3 className="text-xl md:text-2xl font-extrabold m-0">
                      {activeSerpo.headline}
                    </h3>
                    <p
                      className="text-sm leading-relaxed mt-3 mb-0"
                      style={{ color: 'var(--nv-text-muted)' }}
                    >
                      {activeSerpo.desc}
                    </p>
                  </div>

                  <div className={styles.serpoChecklist}>
                    {activeSerpo.checks.map((chk) => (
                      <div key={chk} className={styles.serpoCheckRow}>
                        <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                        <span>{chk}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/40">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: 'var(--nv-text-muted)' }}
                    >
                      Enforced across all 8 autonomous ecosystem entities
                    </span>
                    <Link href="/ecosystem">
                      <Button variant="gold" size="sm">
                        <span>Inspect Entities</span>
                        <ArrowRight size={13} />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* 3. INSTITUTIONAL EVOLUTION CAROUSEL */}
        <section className={styles.sectionBlock}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <span className={styles.eyebrowPill}>ECOSYSTEM ROADMAP & EVOLUTION</span>
              <h2 className={styles.sectionTitle}>How We Built a Multi-Engine Standard</h2>
              <p className={styles.sectionSubtitle}>
                From specialized algorithmic trading desks to a unified BEP-20 sovereign wealth
                gateway serving 25,000+ global participants.
              </p>
            </div>

            <div className={styles.milestoneCard}>
              <div className={styles.milestoneStepsRow}>
                {EVOLUTION_PHASES.map((item, idx) => (
                  <button
                    key={item.phase}
                    type="button"
                    onClick={() => setPhaseIdx(idx)}
                    className={`${styles.milestonePill} ${idx === phaseIdx ? styles.milestonePillActive : ''}`}
                  >
                    <div className="text-[11px] font-extrabold text-amber-400">{item.phase}</div>
                    <div className="text-xs font-extrabold mt-0.5">{item.title}</div>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="max-w-3xl">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                    {activePhase.phase} · {activePhase.period}
                  </span>
                  <h3 className="text-xl font-extrabold mt-1 mb-2">{activePhase.title}</h3>
                  <p
                    className="text-sm leading-relaxed m-0"
                    style={{ color: 'var(--nv-text-muted)' }}
                  >
                    {activePhase.summary}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPhaseIdx(
                        (i) => (i - 1 + EVOLUTION_PHASES.length) % EVOLUTION_PHASES.length,
                      )
                    }
                    className="p-2.5 rounded-lg border border-slate-700/60 hover:border-amber-400"
                    aria-label="Previous Phase"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhaseIdx((i) => (i + 1) % EVOLUTION_PHASES.length)}
                    className="p-2.5 rounded-lg border border-slate-700/60 hover:border-amber-400"
                    aria-label="Next Phase"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. GATEWAY BOUNDARY & COMPLIANCE MATRIX */}
        <section className={styles.sectionBlockAlt}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <span className={styles.eyebrowPill}>GATEWAY SPECIFICATION</span>
              <h2 className={styles.sectionTitle}>Clear Institutional Boundaries</h2>
              <p className={styles.sectionSubtitle}>
                Absolute clarity on what {BRAND_CONFIG.name} Platform orchestrates versus what
                remains strictly decoupled at the entity level.
              </p>
            </div>

            <div className={styles.matrixGrid}>
              <div className={styles.matrixCard}>
                <div className="flex items-center gap-2 text-base font-extrabold text-emerald-400">
                  <CheckCircle2 size={19} />
                  <span>What {BRAND_CONFIG.name} Gateway Orchestrates</span>
                </div>
                {WHAT_WE_ENABLE.map((row) => (
                  <div key={row} className={styles.matrixRow}>
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{row}</span>
                  </div>
                ))}
              </div>

              <div className={styles.matrixCard}>
                <div className="flex items-center gap-2 text-base font-extrabold text-rose-400">
                  <XCircle size={19} />
                  <span>Strict Non-Custodial Guardrails</span>
                </div>
                {WHAT_WE_NEVER_DO.map((row) => (
                  <div key={row} className={styles.matrixRow}>
                    <XCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{row}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 5. QUANTITATIVE PHILOSOPHY BENTO */}
        <section className={styles.sectionBlock}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <span className={styles.eyebrowPill}>FOUNDATIONAL PRINCIPLES</span>
              <h2 className={styles.sectionTitle}>Our Quantitative Philosophy</h2>
            </div>

            <div className={styles.philosophyGrid}>
              {PHILOSOPHY_CARDS.map((card) => (
                <SpotlightCard key={card.num} tone="gold" className={styles.philCard}>
                  <div className={styles.philNum}>{card.num}</div>
                  <div className={styles.philTitle}>{card.title}</div>
                  <p className={styles.philBody}>{card.body}</p>
                </SpotlightCard>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/ecosystem">
                <Button variant="gold" size="lg">
                  <Layers size={16} />
                  <span>Explore All 8 Engines</span>
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="secondary" size="lg">
                  <span>Connect With Institutional Desk</span>
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
