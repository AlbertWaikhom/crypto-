'use client';

import * as React from 'react';
import { ShieldCheck } from 'lucide-react';
import styles from './architecture-graphics.module.css';

export function EcosystemTopologyGraphic() {
  return (
    <div className={styles.graphicCard}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
        <span
          className="font-extrabold uppercase tracking-wider"
          style={{ color: 'var(--nv-gold)' }}
        >
          Ring-Fenced Gateway Topology
        </span>
        <span className="text-[11px] font-semibold" style={{ color: 'var(--nv-text-muted)' }}>
          Zero Cross-Entity Commingling
        </span>
      </div>

      <svg
        viewBox="0 0 640 210"
        className="w-full h-auto"
        role="img"
        aria-label="NAVRIX Sovereign Gateway Topology Diagram"
      >
        <defs>
          <linearGradient id="topoGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F5B82E" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#F5B82E" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* Left Node: Participant Capital */}
        <rect
          x="12"
          y="72"
          width="138"
          height="66"
          rx="12"
          fill="rgba(15, 23, 42, 0.85)"
          stroke="rgba(245, 184, 46, 0.45)"
          strokeWidth="1.4"
        />
        <text x="81" y="99" textAnchor="middle" fill="#F8FAFC" fontSize="11" fontWeight="800">
          BEP-20 USDT
        </text>
        <text x="81" y="116" textAnchor="middle" fill="#94A3B8" fontSize="9.5" fontWeight="600">
          USR-xxxx Sovereign ID
        </text>

        {/* Path Left -> Center */}
        <path
          id="inflowPath"
          d="M 150 105 L 236 105"
          fill="none"
          stroke="url(#topoGold)"
          strokeWidth="2.2"
          strokeDasharray="4 4"
        />
        <circle r="3.5" fill="#F5B82E">
          <animateMotion dur="2.2s" repeatCount="indefinite" path="M 150 105 L 236 105" />
        </circle>

        {/* Center Hub: NAVRIX Gateway */}
        <rect
          x="236"
          y="56"
          width="168"
          height="98"
          rx="16"
          fill="rgba(12, 19, 34, 0.96)"
          stroke="#F5B82E"
          strokeWidth="1.8"
        />
        <text x="320" y="88" textAnchor="middle" fill="#F5B82E" fontSize="10" fontWeight="800">
          SOVEREIGN GATEWAY
        </text>
        <text x="320" y="108" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="800">
          NAVRIX CORE
        </text>
        <text x="320" y="126" textAnchor="middle" fill="#10B981" fontSize="9.5" fontWeight="700">
          Double-Entry Audit Ledger
        </text>
        <text x="320" y="141" textAnchor="middle" fill="#94A3B8" fontSize="8.5">
          Non-Custodial Orchestration
        </text>

        {/* Outbound Bezier Branches to 4 Vertical Clusters */}
        {[
          { y: 28, title: 'Systematic Algo', sub: 'Botxp · Tradex0.3', color: '#F5B82E' },
          { y: 79, title: 'Autonomous Hedge', sub: 'ARB24x5 Neutral', color: '#10B981' },
          { y: 130, title: 'Hybrid & Prop', sub: 'Novex · Funded Master', color: '#38BDF8' },
          {
            y: 181,
            title: 'Signals & Academy',
            sub: 'Blaze · Stockarth · Finup',
            color: '#A855F7',
          },
        ].map((node, idx) => {
          const pathD = `M 404 105 C 442 105, 446 ${node.y}, 476 ${node.y}`;
          return (
            <g key={node.title}>
              <path
                d={pathD}
                fill="none"
                stroke={node.color}
                strokeOpacity="0.55"
                strokeWidth="1.7"
              />
              <circle r="3" fill={node.color}>
                <animateMotion dur={`${2.4 + idx * 0.35}s`} repeatCount="indefinite" path={pathD} />
              </circle>
              <rect
                x="476"
                y={node.y - 20}
                width="152"
                height="40"
                rx="9"
                fill="rgba(15, 23, 42, 0.9)"
                stroke={node.color}
                strokeOpacity="0.5"
                strokeWidth="1.2"
              />
              <text
                x="552"
                y={node.y - 3}
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="10"
                fontWeight="800"
              >
                {node.title}
              </text>
              <text
                x="552"
                y={node.y + 11}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="8.5"
                fontWeight="600"
              >
                {node.sub}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DoubleEntrySolvencyGraphic() {
  const entries = [
    {
      type: 'CREDIT',
      label: 'DEP-20261107 · BEP-20 Verified',
      val: '+10,000.00000000',
      bg: 'rgba(16,185,129,0.14)',
      fg: '#10b981',
    },
    {
      type: 'ALLOC',
      label: 'INV-ARB24X5 · Vault Lock',
      val: '-5,000.00000000',
      bg: 'rgba(245,184,46,0.14)',
      fg: '#f5b82e',
    },
    {
      type: 'YIELD',
      label: 'YLD-00492 · Cycle Settlement',
      val: '+412.50000000',
      bg: 'rgba(56,189,248,0.14)',
      fg: '#38bdf8',
    },
  ];

  return (
    <div className={styles.graphicCard}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-extrabold" style={{ color: 'var(--nv-text)' }}>
          Append-Only Ledger Stream
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-400">
          <ShieldCheck size={13} />
          0.00000000 Variance
        </span>
      </div>

      <div className={styles.ledgerStream}>
        {entries.map((row) => (
          <div key={row.label} className={styles.ledgerEntry}>
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={styles.ledgerTypePill}
                style={{ backgroundColor: row.bg, color: row.fg }}
              >
                {row.type}
              </span>
              <span className="truncate font-semibold" style={{ color: 'var(--nv-text)' }}>
                {row.label}
              </span>
            </div>
            <strong style={{ color: row.fg }}>{row.val}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BscSettlementPipelineGraphic() {
  const nodes = [
    {
      step: 'STAGE 01',
      title: 'UID Deposit Intent',
      sub: 'Dynamic BEP-20 QR & unique USR-xxxx routing tag generated.',
    },
    {
      step: 'STAGE 02',
      title: 'On-Chain Transfer',
      sub: '66-char BSC transaction hash submitted with optional proof.',
    },
    {
      step: 'STAGE 03',
      title: '12-Block Finality',
      sub: 'Automated contract, recipient & decimal verification on Chain 56.',
    },
    {
      step: 'STAGE 04',
      title: 'Atomic Ledger Credit',
      sub: 'Row-locked MySQL credit updates Available or Vault principal.',
    },
  ];

  return (
    <div className={styles.graphicCard}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold" style={{ color: 'var(--nv-text)' }}>
          BNB Smart Chain (BEP-20) Settlement Pipeline
        </span>
        <span className="text-[11px] font-bold" style={{ color: 'var(--nv-gold)' }}>
          &lt; 24h SLA Treasury Review
        </span>
      </div>

      <div className={styles.pipelineGrid}>
        {nodes.map((n) => (
          <div key={n.step} className={styles.pipeNode}>
            <span className={styles.pipeStep}>{n.step}</span>
            <span className={styles.pipeTitle}>{n.title}</span>
            <span className={styles.pipeSub}>{n.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
