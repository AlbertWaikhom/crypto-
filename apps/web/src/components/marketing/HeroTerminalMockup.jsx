'use client';

import * as React from 'react';
import { Lock, ShieldCheck, TrendingUp } from 'lucide-react';
import styles from './hero-terminal-mockup.module.css';

const ENGINE_SPLITS = [
  { name: 'ARB24x5 · Autonomous Hedge', pct: 38, usdt: '18,475 USDT', color: '#10B981' },
  { name: 'Novex · 90D Hybrid Vault', pct: 32, usdt: '15,558 USDT', color: '#38BDF8' },
  { name: 'Botxp · Semi-Auto MT5', pct: 20, usdt: '9,724 USDT', color: '#F5B82E' },
  { name: 'Tradex0.3 · Tactical Alpha', pct: 10, usdt: '4,863 USDT', color: '#F97316' },
];

export function HeroTerminalMockup() {
  const [activeTab, setActiveTab] = React.useState('portfolio');

  return (
    <div className={styles.stageWrap}>
      <div className={styles.ambientGlow} aria-hidden="true" />

      {/* Live Yield Settlement Toast */}
      <div className={styles.floatingToast}>
        <span className={styles.toastDot} />
        <span>
          <strong>+642.50 USDT</strong> Yield Reconciled · ARB24x5 Hedge
        </span>
      </div>

      {/* Main Sovereign Terminal Window */}
      <div className={styles.terminalWindow}>
        <div className={styles.windowBar}>
          <div className={styles.windowDots}>
            <span className={styles.dot} style={{ background: '#f43f5e' }} />
            <span className={styles.dot} style={{ background: '#f5b82e' }} />
            <span className={styles.dot} style={{ background: '#10b981' }} />
          </div>

          <div className={styles.urlPill}>
            <Lock size={10} className="text-emerald-400" />
            <span>navrix.com/dashboard · USR-000842</span>
          </div>

          <span className={styles.chainPill}>BEP-20 · 12/12 BLOCKS</span>
        </div>

        <div className={styles.terminalBody}>
          {/* Top Balance & Mode Switcher */}
          <div className={styles.topBalanceRow}>
            <div>
              <div className={styles.accountLabel}>Total Sovereign Equity</div>
              <div className={styles.balanceMain}>
                <span className={styles.balanceDigits}>48,620.00</span>
                <span className={styles.balanceUnit}>USDT</span>
              </div>
              <div className={styles.deltaRow}>
                <TrendingUp size={12} />
                <span>+6,290.00 USDT (+14.86% Net Credited)</span>
              </div>
            </div>

            <div className={styles.tabGroup} role="tablist" aria-label="Mockup Views">
              {[
                { id: 'portfolio', label: 'Trajectory' },
                { id: 'split', label: 'Engines' },
                { id: 'proof', label: 'Audit Proof' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ''}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Screen Panel */}
          <div className={styles.screenPanel}>
            {activeTab === 'portfolio' && (
              <>
                <div className={styles.chartCaptionRow}>
                  <span>90-Day Append-Only Balance Curve</span>
                  <span style={{ color: 'var(--nv-gold)' }}>4 Decoupled Positions</span>
                </div>

                <svg
                  viewBox="0 0 480 120"
                  className="w-full h-[126px] overflow-visible"
                  role="img"
                  aria-label="90-day portfolio equity growth curve"
                >
                  <defs>
                    <linearGradient id="heroCurveFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F5B82E" stopOpacity="0.36" />
                      <stop offset="95%" stopColor="#F5B82E" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {[22, 56, 90].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="480"
                      y2={y}
                      stroke="rgba(148,163,184,0.16)"
                      strokeDasharray="4 4"
                    />
                  ))}

                  {/* Baseline principal line */}
                  <line
                    x1="0"
                    y1="96"
                    x2="480"
                    y2="96"
                    stroke="rgba(56,189,248,0.35)"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />

                  <path
                    d="M 0 100 C 65 96, 110 86, 165 78 C 225 69, 275 56, 335 42 C 390 29, 435 20, 480 12 L 480 116 L 0 116 Z"
                    fill="url(#heroCurveFill)"
                  />

                  <path
                    d="M 0 100 C 65 96, 110 86, 165 78 C 225 69, 275 56, 335 42 C 390 29, 435 20, 480 12"
                    fill="none"
                    stroke="#F5B82E"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />

                  <circle cx="165" cy="78" r="3.8" fill="#F5B82E" />
                  <circle cx="335" cy="42" r="3.8" fill="#F5B82E" />
                  <circle
                    cx="480"
                    cy="12"
                    r="5.2"
                    fill="#10B981"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </svg>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>Day 01 · 42,330 USDT Principal</span>
                  <span className="font-bold text-emerald-400">Day 90 · 48,620 USDT Verified</span>
                </div>
              </>
            )}

            {activeTab === 'split' && (
              <div className={styles.splitRows}>
                <div className={styles.chartCaptionRow}>
                  <span>Ring-Fenced Capital Allocation</span>
                  <span className="text-emerald-400">Zero Cross-Liability</span>
                </div>
                {ENGINE_SPLITS.map((row) => (
                  <div key={row.name} className={styles.splitRow}>
                    <div className={styles.splitRowMeta}>
                      <span>{row.name}</span>
                      <span style={{ color: row.color }}>
                        {row.pct}% · {row.usdt}
                      </span>
                    </div>
                    <div className={styles.splitBarTrack}>
                      <div
                        className={styles.splitBarFill}
                        style={{ width: `${row.pct}%`, background: row.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'proof' && (
              <div className={styles.proofRows}>
                <div className={styles.chartCaptionRow}>
                  <span>Row-Locked MySQL Double-Entry Proof</span>
                  <span className="text-emerald-400">100% Solvency</span>
                </div>
                <div className={styles.proofRow}>
                  <span className="text-slate-400">Available + Escrow Vault</span>
                  <strong data-tabular="true">12,620.00000000 USDT</strong>
                </div>
                <div className={styles.proofRow}>
                  <span className="text-slate-400">Active Engine Principal</span>
                  <strong data-tabular="true">36,000.00000000 USDT</strong>
                </div>
                <div className={styles.proofRow}>
                  <span className="text-slate-400">Net Ledger Credits − Debits</span>
                  <strong className="text-amber-400" data-tabular="true">
                    48,620.00000000 USDT
                  </strong>
                </div>
                <div className={styles.proofRow}>
                  <span className="text-emerald-400 font-bold">Reconciliation Discrepancy</span>
                  <strong className="text-emerald-400" data-tabular="true">
                    0.00000000 USDT
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Bottom 3-KPI Strip */}
          <div className={styles.miniKpiStrip}>
            <div className={styles.miniKpiBox}>
              <div className={styles.miniKpiLbl}>Available Liquidity</div>
              <div className={styles.miniKpiVal}>12,620.00 USDT</div>
            </div>
            <div className={styles.miniKpiBox}>
              <div className={styles.miniKpiLbl}>Allocated Engines</div>
              <div className={styles.miniKpiVal}>36,000.00 USDT</div>
            </div>
            <div className={styles.miniKpiBox}>
              <div className={styles.miniKpiLbl}>Solvency Variance</div>
              <div className={styles.miniKpiVal} style={{ color: '#10b981' }}>
                0.00000000
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Mobile BEP-20 QR Vault Overlay */}
      <div className={styles.mobileVaultCard}>
        <div className={styles.qrTile} aria-hidden="true">
          <svg viewBox="0 0 36 36" className="w-full h-full">
            <rect x="2" y="2" width="10" height="10" rx="1.5" fill="#070b14" />
            <rect x="4" y="4" width="6" height="6" fill="#fff" />
            <rect x="5.5" y="5.5" width="3" height="3" fill="#070b14" />

            <rect x="24" y="2" width="10" height="10" rx="1.5" fill="#070b14" />
            <rect x="26" y="4" width="6" height="6" fill="#fff" />
            <rect x="27.5" y="5.5" width="3" height="3" fill="#070b14" />

            <rect x="2" y="24" width="10" height="10" rx="1.5" fill="#070b14" />
            <rect x="4" y="26" width="6" height="6" fill="#fff" />
            <rect x="5.5" y="27.5" width="3" height="3" fill="#070b14" />

            <rect x="15" y="4" width="3" height="3" fill="#070b14" />
            <rect x="19" y="8" width="3" height="3" fill="#070b14" />
            <rect x="14" y="14" width="8" height="8" rx="1.5" fill="#d99b1e" />
            <rect x="4" y="16" width="6" height="3" fill="#070b14" />
            <rect x="26" y="16" width="6" height="3" fill="#070b14" />
            <rect x="16" y="25" width="4" height="7" fill="#070b14" />
            <rect x="23" y="24" width="4" height="4" fill="#070b14" />
            <rect x="29" y="28" width="5" height="6" fill="#070b14" />
          </svg>
        </div>

        <div className="min-w-0">
          <div className={styles.vaultCardTitle}>BEP-20 Deposit Vault</div>
          <div className={styles.vaultCardHash}>0x9838...fb7b521</div>
          <div className={styles.vaultCardStatus}>
            <ShieldCheck size={11} />
            <span>Verified BSC Treasury</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroTerminalMockup;
