'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { SpiralFunnel } from './SpiralFunnel';
import styles from './hero-29.module.css';

const FUNNEL_STAGES = [
  {
    id: 'gateway',
    title: 'Global Participant Gateway',
    count: '25,000+',
    subtitle: 'Active ecosystem allocators across 60+ jurisdictions',
  },
  {
    id: 'engines',
    title: 'Specialized Execution Engines',
    count: '8 Entities',
    subtitle: 'Independent models · Systematic, hedge & prop allocations',
  },
  {
    id: 'ledger',
    title: 'Double-Entry Solvency Proof',
    count: '100% Proof',
    subtitle: 'Append-only cryptographic ledger · Zero commingling',
  },
  {
    id: 'settlement',
    title: 'BEP-20 Capital Settlement',
    count: 'BSC Finality',
    subtitle: 'Automated non-custodial USDT routing & payout custody',
  },
];

export function Hero29() {
  const [activeStage, setActiveStage] = React.useState('gateway');

  return (
    <section className={styles.heroViewport}>
      {/* Background Radial Light Mist with White Luminance & Subtle Gold */}
      <div className={styles.ambientLuminance} aria-hidden="true" />
      <div className={styles.ambientTopWhiteMist} aria-hidden="true" />

      <div className={styles.heroContainer}>
        {/* LEFT COLUMN: Hero 29 Typography & Action Buttons */}
        <div className={styles.leftCol}>
          <div className={styles.badgeRow}>
            <span className={styles.eyebrowBadge}>
              <Sparkles className={styles.badgeSparkle} />
              <span>FINANCIAL INNOVATION ECOSYSTEM</span>
            </span>
          </div>

          <h1 className={styles.headline}>
            One ecosystem.
            <span className={styles.headlineSub}>Multiple financial engines.</span>
          </h1>

          <p className={styles.description}>
            {BRAND_CONFIG.name} Platform is a structured financial innovation ecosystem connecting
            participants with specialized companies across systematic trading, hedge models, hybrid
            funds, and institutional market education.
          </p>

          <div className={styles.ctaGroup}>
            <Link href="/ecosystem" className={styles.primaryWhiteBtn}>
              Explore ecosystem
            </Link>

            <Link href="/login" className={styles.secondaryTextBtn}>
              <span>Unified sign in</span>
              <ArrowRight className={styles.arrowIcon} />
            </Link>
          </div>
        </div>

        {/* CENTER COLUMN: Light Vortex Funnel (@reactbits-starter/spiral-funnel-tw) */}
        <div className={styles.centerFunnelCol}>
          <SpiralFunnel
            strandCount={64}
            speed={1}
            color="#ffffff"
            highlightColor="#f5b82e"
            swellStrength={32}
            particleCount={70}
            glow
          />
        </div>

        {/* RIGHT COLUMN: Minimal Hero 29 Stage Metrics */}
        <div className={styles.rightCol}>
          <div className={styles.stagesList}>
            {FUNNEL_STAGES.map((stage) => {
              const isActive = activeStage === stage.id;
              return (
                <div
                  key={stage.id}
                  className={`${styles.stageRow} ${isActive ? styles.stageRowActive : ''}`}
                  onMouseEnter={() => setActiveStage(stage.id)}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveStage(stage.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveStage(stage.id);
                    }
                  }}
                >
                  {/* Active Orange/Gold Left Bar Indicator */}
                  <div
                    className={`${styles.indicatorBar} ${isActive ? styles.indicatorBarActive : ''}`}
                  />

                  <div className={styles.stageContent}>
                    <div className={styles.stageHeader}>
                      <span className={styles.stageTitle}>{stage.title}</span>
                      <span className={styles.stageCount}>{stage.count}</span>
                    </div>
                    <div className={styles.stageSubtitle}>{stage.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero29;
