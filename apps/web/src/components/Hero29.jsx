'use client';
import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronRight, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { SpiralFunnel } from './SpiralFunnel';
import styles from './hero-29.module.css';
const FUNNEL_STAGES = [
  {
    id: 'gateway',
    stageName: 'Global Participant Gateway',
    metric: '25,000+',
    description: 'Active Ecosystem Accounts',
    subDetail: 'Multi-model access across global regions',
    toneColor: '#f5b82e', // NAVRIX Gold
  },
  {
    id: 'engines',
    stageName: 'Specialized Execution Engines',
    metric: '8 Entities',
    description: 'Independent Model Allocation',
    subDetail: 'Systematic, hedge, hybrid & prop accounts',
    toneColor: '#ffffff', // Luminous White
  },
  {
    id: 'ledger',
    stageName: 'Double-Entry Solvency Verification',
    metric: '100% Proof',
    description: 'Zero Commingling or Overdraft',
    subDetail: 'MySQL append-only cryptographic ledger',
    toneColor: '#f5b82e', // NAVRIX Gold
  },
  {
    id: 'settlement',
    stageName: 'BEP-20 Capital Settlement',
    metric: 'BSC Finality',
    description: 'Instant Outbound Escrow',
    subDetail: 'Direct on-chain USDT routing & custody safety',
    toneColor: '#10b981', // Emerald Success
  },
];
export function Hero29() {
  return (
    <section className={styles.heroViewport}>
      {/* Background Radial Light Mist with White & Gold Luminance */}
      <div className={styles.ambientLuminance} aria-hidden="true" />

      <div className={styles.heroContainer}>
        {/* LEFT COLUMN: Commanding Value Proposition */}
        <div className={styles.leftCol}>
          <div className={styles.badgeRow}>
            <span className={styles.eyebrowBadge}>
              <Sparkles className={styles.badgeSparkle} />
              <span>FINANCIAL INNOVATION ECOSYSTEM</span>
            </span>
            <span className={styles.verifiedTag}>
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>25,000+ Global Accounts</span>
            </span>
          </div>

          <h1 className={styles.headline}>
            One Ecosystem. <span className={styles.headlineGold}>Multiple Financial Engines.</span>
          </h1>

          <p className={styles.description}>
            {BRAND_CONFIG.name} Platform is a structured financial innovation ecosystem connecting
            traders, allocators, and capital participants with specialized companies across
            systematic execution, hedge systems, hybrid funds, and institutional education.
          </p>

          <div className={styles.ctaGroup}>
            <Link href="/ecosystem" className={styles.primaryWhiteBtn}>
              <span>Explore Ecosystem</span>
              <ChevronRight className="h-4 w-4" />
            </Link>

            <Link href="/login" className={styles.secondaryTextBtn}>
              <Lock className="h-3.5 w-3.5 opacity-70" />
              <span>Unified Sign In</span>
              <ArrowRight className={styles.arrowIcon} />
            </Link>
          </div>

          <div className={styles.subPillarsRow}>
            <div className={styles.pillarItem}>
              <span className={styles.pillarDotGold} />
              <span>Multi-Model Architecture</span>
            </div>
            <div className={styles.pillarItem}>
              <span className={styles.pillarDotWhite} />
              <span>Independent Entity Oversight</span>
            </div>
            <div className={styles.pillarItem}>
              <span className={styles.pillarDotEmerald} />
              <span>Non-Custodial Settlement</span>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Interactive Spiral Funnel Canvas (@reactbits-starter/spiral-funnel-tw) */}
        <div className={styles.centerFunnelCol}>
          <SpiralFunnel
            strandCount={64}
            speed={1}
            color="#ffffff"
            highlightColor="#f5b82e"
            swellStrength={32}
            particleCount={65}
            glow
          />
        </div>

        {/* RIGHT COLUMN: Funnel Stages & Spill Metrics */}
        <div className={styles.rightCol}>
          <div className={styles.funnelStageList}>
            {FUNNEL_STAGES.map((stage, idx) => (
              <div key={stage.id} className={styles.stageCard}>
                <div className={styles.stageIndicatorLine}>
                  <span className={styles.stagePip} style={{ backgroundColor: stage.toneColor }} />
                  {idx < FUNNEL_STAGES.length - 1 && (
                    <span className={styles.stageVerticalConnector} />
                  )}
                </div>

                <div className={styles.stageContent}>
                  <div className={styles.stageTopRow}>
                    <span className={styles.stageTitle}>{stage.stageName}</span>
                    <span
                      className={styles.stageMetric}
                      style={{
                        color:
                          stage.toneColor === '#f5b82e'
                            ? 'var(--nv-gold)'
                            : stage.toneColor === '#10b981'
                              ? '#34d399'
                              : '#ffffff',
                      }}
                    >
                      {stage.metric}
                    </span>
                  </div>
                  <div className={styles.stageDesc}>{stage.description}</div>
                  <div className={styles.stageSubDetail}>{stage.subDetail}</div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.rightBottomNote}>
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>Real-time multi-engine architecture with verifiable on-chain settlement.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
export default Hero29;
