'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { Button } from '@navrix/ui';
import styles from './capital-allocation-simulator.module.css';

const CAPITAL_PRESETS = [2500, 10000, 25000, 50000];

const HORIZONS = [
  { days: 30, label: '30 Days' },
  { days: 90, label: '90 Days' },
  { days: 180, label: '180 Days' },
  { days: 365, label: '365 Days' },
];

const MANDATES = [
  {
    id: 'hedge',
    title: 'Market-Neutral Hedge Core',
    sub: 'Delta-balanced ARB24x5 + duration-matched Novex USDT vaults',
    monthlyRate: 0.036,
    badge: 'Lower Beta',
    weights: [
      { name: 'ARB24x5 Hedge', pct: 50, color: '#10B981' },
      { name: 'Novex USDT Vault', pct: 35, color: '#38BDF8' },
      { name: 'Botxp Semi-Auto', pct: 15, color: '#F5B82E' },
    ],
  },
  {
    id: 'balanced',
    title: 'Balanced Multi-Engine Mandate',
    sub: 'Diversified exposure across hedge, pooled vaults & systematic MT5',
    monthlyRate: 0.052,
    badge: 'Core Standard',
    weights: [
      { name: 'ARB24x5 Hedge', pct: 35, color: '#10B981' },
      { name: 'Novex USDT Vault', pct: 30, color: '#38BDF8' },
      { name: 'Botxp Semi-Auto', pct: 25, color: '#F5B82E' },
      { name: 'Tradex0.3 Tactical', pct: 10, color: '#F97316' },
    ],
  },
  {
    id: 'alpha',
    title: 'Dynamic Quantitative Alpha',
    sub: 'Higher algorithmic weighting in Botxp & Tradex0.3 with hedge anchor',
    monthlyRate: 0.072,
    badge: 'Tactical Growth',
    weights: [
      { name: 'Botxp Semi-Auto', pct: 38, color: '#F5B82E' },
      { name: 'Tradex0.3 Tactical', pct: 27, color: '#F97316' },
      { name: 'ARB24x5 Hedge', pct: 20, color: '#10B981' },
      { name: 'Novex USDT Vault', pct: 15, color: '#38BDF8' },
    ],
  },
];

function formatUsdt(num) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(num));
}

export function CapitalAllocationSimulator() {
  const [capital, setCapital] = React.useState(10000);
  const [days, setDays] = React.useState(90);
  const [mandateId, setMandateId] = React.useState('balanced');

  const activeMandate = MANDATES.find((m) => m.id === mandateId) || MANDATES[1];
  const months = days / 30;

  const { endValue, netGain, pctGain, svgPath, svgArea } = React.useMemo(() => {
    const steps = 12;
    const vals = [];
    for (let i = 0; i <= steps; i++) {
      const m = (i / steps) * months;
      vals.push(capital * Math.pow(1 + activeMandate.monthlyRate, m));
    }
    const finalVal = vals[vals.length - 1];
    const gain = finalVal - capital;
    const pct = ((gain / capital) * 100).toFixed(1);

    const w = 440;
    const h = 108;
    const min = capital * 0.98;
    const max = Math.max(finalVal * 1.03, capital * 1.08);
    const span = Math.max(1, max - min);

    const pts = vals.map((v, idx) => {
      const x = (idx / steps) * w;
      const y = h - ((v - min) / span) * (h - 18) - 8;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    const pathStr = pts.join(' ');
    const areaStr = `${pathStr} L ${w} ${h} L 0 ${h} Z`;

    return {
      endValue: finalVal,
      netGain: gain,
      pctGain: pct,
      svgPath: pathStr,
      svgArea: areaStr,
    };
  }, [capital, months, activeMandate]);

  return (
    <div className={styles.simWrapper}>
      {/* Left Interactive Controls */}
      <div className={styles.controlsCol}>
        {/* Capital Slider */}
        <div className={styles.controlGroup}>
          <div className={styles.labelRow}>
            <span className={styles.controlLabel}>1. Initial USDT Allocation</span>
            <span className={styles.capitalReadout}>{formatUsdt(capital)} USDT</span>
          </div>

          <input
            type="range"
            min={1000}
            max={100000}
            step={500}
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            className={styles.rangeInput}
            aria-label="Initial USDT Allocation"
          />

          <div className={styles.presetRow}>
            {CAPITAL_PRESETS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setCapital(val)}
                className={`${styles.presetBtn} ${capital === val ? styles.presetBtnActive : ''}`}
              >
                ${formatUsdt(val)}
              </button>
            ))}
          </div>
        </div>

        {/* Tenor Selector */}
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>2. Allocation Horizon</span>
          <div className={styles.presetRow}>
            {HORIZONS.map((h) => (
              <button
                key={h.days}
                type="button"
                onClick={() => setDays(h.days)}
                className={`${styles.presetBtn} ${days === h.days ? styles.presetBtnActive : ''}`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mandate Profile Selector */}
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>3. Multi-Engine Diversification Mandate</span>
          <div className={styles.mandateList}>
            {MANDATES.map((m) => {
              const active = m.id === mandateId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMandateId(m.id)}
                  className={`${styles.mandateBtn} ${active ? styles.mandateBtnActive : ''}`}
                >
                  <div>
                    <div className={styles.mandateTitle}>{m.title}</div>
                    <div className={styles.mandateSub}>{m.sub}</div>
                  </div>
                  <span className={styles.mandateBadge}>{m.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Link href="/register">
          <Button variant="gold" size="lg" className="w-full">
            <span>Configure Mandate in Investor Portal</span>
            <ArrowRight size={15} />
          </Button>
        </Link>
      </div>

      {/* Right Dynamic Visualization */}
      <div className={styles.visualCol}>
        <div className={styles.summaryHeader}>
          <div>
            <div className={styles.controlLabel}>Simulated {days}-Day Multi-Engine Value</div>
            <div className={styles.projectedTotal}>{formatUsdt(endValue)} USDT</div>
          </div>

          <div className={styles.projectedDelta}>
            <TrendingUp size={14} />
            <span>
              +{formatUsdt(netGain)} USDT (+{pctGain}%)
            </span>
          </div>
        </div>

        {/* Stacked Diversification Graphic */}
        <div className={styles.stackedBarWrap}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Engine Sleeve Diversification</span>
            <span style={{ color: 'var(--nv-gold)' }}>Zero Cross-Liability</span>
          </div>

          <div className={styles.stackedBar}>
            {activeMandate.weights.map((w) => (
              <div
                key={w.name}
                style={{
                  width: `${w.pct}%`,
                  backgroundColor: w.color,
                  transition: 'width 0.35s ease',
                }}
                title={`${w.name}: ${w.pct}%`}
              />
            ))}
          </div>

          <div className={styles.allocLegendGrid}>
            {activeMandate.weights.map((w) => (
              <div key={w.name} className={styles.allocLegendItem}>
                <span className="inline-flex items-center gap-2 font-semibold truncate">
                  <span className={styles.swatchDot} style={{ background: w.color }} />
                  <span className="truncate">{w.name}</span>
                </span>
                <strong data-tabular="true">
                  {w.pct}% ({formatUsdt((capital * w.pct) / 100)})
                </strong>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Compounding SVG Trajectory */}
        <div className={styles.curveFrame}>
          <div className="flex items-center justify-between text-[11px] font-bold mb-2">
            <span>Illustrative Compounded Trajectory</span>
            <span className="text-slate-400">BEP-20 USDT Denominated</span>
          </div>

          <svg
            viewBox="0 0 440 108"
            className="w-full h-[104px] overflow-visible"
            role="img"
            aria-label="Simulated multi-engine capital curve"
          >
            <defs>
              <linearGradient id="simCurveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5B82E" stopOpacity="0.34" />
                <stop offset="95%" stopColor="#F5B82E" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {[22, 55, 88].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="440"
                y2={y}
                stroke="rgba(148,163,184,0.16)"
                strokeDasharray="4 4"
              />
            ))}

            <path d={svgArea} fill="url(#simCurveFill)" />
            <path
              d={svgPath}
              fill="none"
              stroke="#F5B82E"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Day 0 · {formatUsdt(capital)} USDT</span>
            <span className="font-bold text-amber-400">
              Day {days} · {formatUsdt(endValue)} USDT
            </span>
          </div>
        </div>

        <div className={styles.disclosureNote}>
          <strong>Model Simulation Disclosure:</strong> Projections above are strictly illustrative
          mathematical simulations for portfolio diversification modeling and do not represent fixed
          or guaranteed yields. Each independent ecosystem entity carries market and execution risk.
        </div>
      </div>
    </div>
  );
}

export default CapitalAllocationSimulator;
