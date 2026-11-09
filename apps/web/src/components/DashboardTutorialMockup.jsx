'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Layers,
  LineChart,
  Lock,
  Pause,
  PieChart,
  Play,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@navrix/ui';
import styles from './dashboard-tutorial-mockup.module.css';
const TUTORIAL_STEPS = [
  {
    id: 'vault',
    stepNum: '01',
    badge: 'Step 01 · On-Chain Treasury',
    title: 'Dedicated BEP-20 USDT Vault',
    subtitle: 'Unique USR-xxxx identifier bound to BSC Smart Chain',
    description:
      'Every customer receives a sovereign USR-xxxx identifier mapped to our verified BSC receiving contract. Generate instant dynamic QR codes, submit 66-character tx hashes, and receive 24h SLA review.',
    icon: Wallet,
    hotspotLabel: '1. Deposit USDT Vault',
  },
  {
    id: 'allocation',
    stepNum: '02',
    badge: 'Step 02 · Strategy Allocation',
    title: 'Multi-Engine Capital Diversification',
    subtitle: 'Botxp Semi-Auto, ARB24x5 Hedge & Novex Pooled Capital',
    description:
      'Rather than relying on one fragile trading strategy, participants allocate capital across specialized, autonomous companies. Each entity operates with its own algorithmic risk parameters and audited execution.',
    icon: Layers,
    hotspotLabel: '2. Strategy Engines',
  },
  {
    id: 'ledger',
    stepNum: '03',
    badge: 'Step 03 · Mathematical Audit',
    title: 'Append-Only Double-Entry Ledger',
    subtitle: 'Row-locked MySQL ledger with 0.00000000 discrepancy',
    description:
      'Balances are never overwritten directly. Every deposit, yield accrual, lock, and payout generates an immutable row-locked audit record. Master Admin continuously verifies aggregate wallet equity matches net ledger credits.',
    icon: LineChart,
    hotspotLabel: '3. Ledger Curve',
  },
  {
    id: 'settlement',
    stepNum: '04',
    badge: 'Step 04 · Escrow Settlement',
    title: 'Frictionless Non-Custodial Withdrawals',
    subtitle: 'Atomic available-to-locked balance transitions',
    description:
      'Request principal or yield payouts with one click. Liquidity is atomically escrow-locked during SLA review to eliminate overdraft risks, then dispatched on-chain directly to your personal BSC address.',
    icon: ArrowUpFromLine,
    hotspotLabel: '4. Fast Payouts',
  },
];
export function DashboardTutorialMockup() {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [progressPercent, setProgressPercent] = React.useState(0);
  const activeStep = TUTORIAL_STEPS[currentStepIndex];
  // Auto-advancing tutorial loop
  React.useEffect(() => {
    if (!isPlaying) {
      setProgressPercent(0);
      return;
    }
    const intervalMs = 50;
    const stepDurationMs = 5000;
    const increment = (intervalMs / stepDurationMs) * 100;
    const timer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) {
          setCurrentStepIndex((curr) => (curr + 1) % TUTORIAL_STEPS.length);
          return 0;
        }
        return prev + increment;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex]);
  const handleSelectStep = (idx) => {
    setCurrentStepIndex(idx);
    setProgressPercent(0);
  };
  const handleNext = () => {
    setCurrentStepIndex((curr) => (curr + 1) % TUTORIAL_STEPS.length);
    setProgressPercent(0);
  };
  const handlePrev = () => {
    setCurrentStepIndex((curr) => (curr - 1 + TUTORIAL_STEPS.length) % TUTORIAL_STEPS.length);
    setProgressPercent(0);
  };
  const IconComponent = activeStep.icon;
  return (
    <div className={styles.mockupRoot}>
      {/* 1. TOUR CONTROLLER BAR */}
      <div className={styles.tourControlBar}>
        <div className={styles.tourTitleCluster}>
          <span className={styles.tourBadge}>
            <Sparkles className="h-3 w-3 text-amber-400" />
            INTERACTIVE PLATFORM TOUR
          </span>
          <span className={styles.tourHeading}>Experience the Investor Experience</span>
        </div>

        {/* 4 Step Buttons */}
        <div className={styles.stepPillsGroup}>
          {TUTORIAL_STEPS.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectStep(idx)}
                className={`${styles.stepPillBtn} ${isActive ? styles.stepPillActive : ''}`}
              >
                <span>{s.stepNum}</span>
                <span>{s.hotspotLabel.split('. ')[1]}</span>
              </button>
            );
          })}
        </div>

        {/* Tour Actions */}
        <div className={styles.tourActions}>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className={styles.actionBtn}
            title={isPlaying ? 'Pause Auto Tour' : 'Resume Auto Tour'}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 text-amber-400" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-emerald-400" />
                <span>Auto-Play</span>
              </>
            )}
          </button>

          <Link href="/register">
            <Button variant="gold" size="sm">
              Try In Portal <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Progress Bar Track */}
        <div className={styles.progressBarTrack}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${isPlaying ? progressPercent : 100}%` }}
          />
        </div>
      </div>

      {/* 2. FLOATING TUTORIAL CALLOUT CARD */}
      <div className={styles.tourCalloutBox}>
        <div className={styles.calloutLeft}>
          <div className={styles.calloutIconCircle}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <div className={styles.calloutStepBadge}>{activeStep.badge}</div>
            <h3 className={styles.calloutTitle}>{activeStep.title}</h3>
            <div className={styles.calloutSubtitle}>{activeStep.subtitle}</div>
            <p className={styles.calloutDesc}>{activeStep.description}</p>
          </div>
        </div>

        <div className={styles.calloutNavButtons}>
          <button
            type="button"
            onClick={handlePrev}
            className={styles.actionBtn}
            aria-label="Previous Tutorial Step"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={styles.actionBtn}
            aria-label="Next Tutorial Step"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3. REALISTIC DASHBOARD WINDOW FRAME */}
      <div className={styles.windowFrame}>
        {/* Window Chrome Titlebar */}
        <div className={styles.windowTitlebar}>
          <div className={styles.windowDots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>

          <div className={styles.windowUrlPill}>
            <Lock className="h-3 w-3 text-emerald-400" />
            <span>portal.navrix.com / dashboard / USR-000003</span>
          </div>

          <div className={styles.windowStatusCluster}>
            <span className={styles.networkPulseDot} />
            <span className={styles.networkText}>BSC Mainnet · Block #42,109,240</span>
          </div>
        </div>

        {/* Dashboard Body Content */}
        <div className={styles.dashboardBody}>
          {/* User Greeting Bar */}
          <div className={styles.greetingRow}>
            <div className={styles.greetingUser}>
              <div className={styles.userAvatarBadge}>AM</div>
              <div>
                <div className={styles.userNameText}>Alice Mercer</div>
                <div className={styles.userUidText}>USR-000003 · Dedicated BEP-20 Ledger</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={styles.verifiedTag}>
                <ShieldCheck className="h-3.5 w-3.5" />
                KYC Level 2 Verified
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Sovereign Investor Portal
              </span>
            </div>
          </div>

          {/* Top Hero Vault Bar (Hotspot 1 & 4) */}
          <div
            className={`${styles.vaultBar} ${
              activeStep.id === 'vault' || activeStep.id === 'settlement'
                ? styles.highlightedSection
                : ''
            }`}
          >
            {/* Clickable Hotspot Badge 1 */}
            <div className={styles.hotspotBadge} onClick={() => handleSelectStep(0)}>
              <Sparkles className="h-3 w-3" />
              <span>Step 1: Deposit USDT</span>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Portfolio Balance
              </div>
              <div className="flex items-baseline mt-0.5">
                <span className={styles.vaultBalanceNumber}>14,850.00</span>
                <span className={styles.vaultCurrency}>USDT</span>
              </div>
              <div className={styles.yieldPill}>
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+1,850.00 USDT Total Yield Credited</span>
                <span className="text-slate-500 hidden md:inline">· Append-Only MySQL Ledger</span>
              </div>
            </div>

            <div className={styles.vaultActionGroup}>
              <button
                type="button"
                className={styles.mockDepositBtn}
                onClick={() => handleSelectStep(0)}
              >
                <ArrowDownToLine className="h-4 w-4" />
                <span>+ Deposit USDT</span>
              </button>

              <button
                type="button"
                className={styles.mockSecondaryBtn}
                onClick={() => handleSelectStep(1)}
              >
                <Layers className="h-4 w-4 text-amber-400" />
                <span>Strategy Engines</span>
              </button>

              <button
                type="button"
                className={styles.mockSecondaryBtn}
                onClick={() => handleSelectStep(3)}
              >
                <ArrowUpFromLine className="h-4 w-4 text-emerald-400" />
                <span>Withdrawal</span>
              </button>
            </div>
          </div>

          {/* 4-Column KPI Stats Strip */}
          <div className={styles.kpiGrid}>
            {/* KPI 1: Available Liquidity (Highlighted in Step 4) */}
            <div
              className={`${styles.kpiCard} ${activeStep.id === 'settlement' ? styles.highlightedSection : ''}`}
            >
              <div className={styles.kpiLabel}>
                <span>Available Liquidity</span>
                <Wallet className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className={styles.kpiValue}>4,850.00 USDT</div>
              <div className={styles.kpiSub}>Ready for instant withdrawal</div>
            </div>

            {/* KPI 2: Invested Principal (Highlighted in Step 2) */}
            <div
              className={`${styles.kpiCard} ${activeStep.id === 'allocation' ? styles.highlightedSection : ''}`}
            >
              <div className={styles.kpiLabel}>
                <span>Active Strategy Capital</span>
                <Layers className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className={styles.kpiValue}>10,000.00 USDT</div>
              <div className={styles.kpiSub}>3 decoupled strategy positions</div>
            </div>

            {/* KPI 3: Total Yield (Highlighted in Step 3) */}
            <div
              className={`${styles.kpiCard} ${activeStep.id === 'ledger' ? styles.highlightedSection : ''}`}
            >
              <div className={styles.kpiLabel}>
                <span>Immutable Yield Accrued</span>
                <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className={`${styles.kpiValue} text-emerald-400`}>+1,850.00 USDT</div>
              <div className={styles.kpiSub}>Cryptographically credited</div>
            </div>

            {/* KPI 4: Solvency Verification */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>
                <span>Solvency Status</span>
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <div className={`${styles.kpiValue} text-cyan-400`}>100% RECONCILED</div>
              <div className={styles.kpiSub}>0.00000000 ledger variance</div>
            </div>
          </div>

          {/* 2-Column Bento: Chart + Strategy Engines */}
          <div className={styles.bentoRow}>
            {/* Left: 30-Day Ledger Progression Chart (Hotspot 3) */}
            <div
              className={`${styles.chartCard} ${activeStep.id === 'ledger' ? styles.highlightedSection : ''}`}
            >
              <div className={styles.hotspotBadge} onClick={() => handleSelectStep(2)}>
                <Sparkles className="h-3 w-3" />
                <span>Step 3: Double-Entry Ledger</span>
              </div>

              <div className={styles.chartHeader}>
                <div className={styles.chartTitle}>
                  <LineChart className="h-4 w-4 text-amber-400" />
                  <span>Immutable Balance Trajectory</span>
                </div>
                <span className={styles.chartBadge}>+18.5% 30-Day Net Growth</span>
              </div>

              {/* Realistic SVG Area Curve */}
              <div className={styles.chartSvgWrap}>
                <svg viewBox="0 0 500 130" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="ledgerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F5B82E" stopOpacity="0.38" />
                      <stop offset="85%" stopColor="#F5B82E" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guideline Grids */}
                  <line
                    x1="0"
                    y1="25"
                    x2="500"
                    y2="25"
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="0"
                    y1="65"
                    x2="500"
                    y2="65"
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="0"
                    y1="105"
                    x2="500"
                    y2="105"
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 4"
                  />

                  {/* Gradient Area */}
                  <path
                    d="M 0 115 Q 80 110, 150 95 T 300 60 T 420 30 T 500 15 L 500 130 L 0 130 Z"
                    fill="url(#ledgerGradient)"
                  />

                  {/* Stroke Line */}
                  <path
                    d="M 0 115 Q 80 110, 150 95 T 300 60 T 420 30 T 500 15"
                    fill="none"
                    stroke="#F5B82E"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Interactive Milestone Dots */}
                  <circle cx="0" cy="115" r="4" fill="#F5B82E" />
                  <circle cx="150" cy="95" r="4" fill="#F5B82E" />
                  <circle cx="300" cy="60" r="4" fill="#F5B82E" />
                  <circle cx="420" cy="30" r="4" fill="#F5B82E" />
                  <circle cx="500" cy="15" r="5" fill="#10B981" stroke="#fff" strokeWidth="2" />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                <span>Day 0: $10,000 USDT Deposit</span>
                <span className="text-amber-400 font-bold">Day 30: $14,850 USDT (Reconciled)</span>
              </div>
            </div>

            {/* Right: Strategy Engine Allocations (Hotspot 2) */}
            <div
              className={`${styles.strategyCard} ${activeStep.id === 'allocation' ? styles.highlightedSection : ''}`}
            >
              <div className={styles.hotspotBadge} onClick={() => handleSelectStep(1)}>
                <Sparkles className="h-3 w-3" />
                <span>Step 2: Strategy Allocations</span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-amber-400" />
                    <span>Allocated Strategies</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">3 Active Engines</span>
                </div>

                <div className={styles.strategyList}>
                  {/* Strategy 1: Botxp */}
                  <div className={styles.strategyItem}>
                    <div className={styles.strategyLeft}>
                      <div className={styles.strategyIconBox}>
                        <Cpu className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className={styles.strategyName}>Botxp</div>
                        <div className={styles.strategyType}>Semi-Automated Systematic</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold">5,000 USDT</div>
                      <div className={styles.strategyYield}>+12.4% MTD</div>
                    </div>
                  </div>

                  {/* Strategy 2: ARB24x5 */}
                  <div className={styles.strategyItem}>
                    <div className={styles.strategyLeft}>
                      <div
                        className={styles.strategyIconBox}
                        style={{ color: '#10B981', backgroundColor: 'rgba(16,185,129,0.14)' }}
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className={styles.strategyName}>ARB24x5</div>
                        <div className={styles.strategyType}>Automated Hedge System</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold">3,000 USDT</div>
                      <div className={styles.strategyYield}>+8.9% MTD</div>
                    </div>
                  </div>

                  {/* Strategy 3: Novex Portfolio */}
                  <div className={styles.strategyItem}>
                    <div className={styles.strategyLeft}>
                      <div
                        className={styles.strategyIconBox}
                        style={{ color: '#06B6D4', backgroundColor: 'rgba(6,182,212,0.14)' }}
                      >
                        <PieChart className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className={styles.strategyName}>Novex Portfolio</div>
                        <div className={styles.strategyType}>Hybrid Pooled Capital</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold">2,000 USDT</div>
                      <div className={styles.strategyYield}>Weekly Yield</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between text-slate-400">
                <span>Autonomous Risk Controls</span>
                <span className="text-amber-400 font-bold">Zero Commingling</span>
              </div>
            </div>
          </div>

          {/* Solvency Audit Strip */}
          <div className={styles.solvencyStrip}>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>On-Chain BNB Smart Chain Treasury: 0x9838...b521 Verified</span>
            </div>
            <div className="text-xs font-bold text-slate-300 hidden md:block">
              Double-Entry Solvency Verified: 0.00000000 Discrepancy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
