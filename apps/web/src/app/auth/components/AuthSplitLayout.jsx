import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Clock,
  KeyRound,
  Lock,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import styles from './auth-suite.module.css';

const SHOWCASE_SLIDES = [
  {
    eyebrow: 'Why allocators switch',
    quote:
      'We replaced fragmented exchange wallets and manual spreadsheets with one double-entry audited treasury. Every BEP-20 deposit and daily yield credit reconciles to the cent.',
    initials: 'MP',
    author: 'Mina Park',
    role: 'Head of Treasury Operations, Aurelia Digital',
    metrics: [
      { value: '1 day', label: 'Vault setup' },
      { value: '100%', label: 'Ledger reconciled' },
      { value: '24/7', label: 'On-chain audit' },
    ],
  },
  {
    eyebrow: 'Institutional settlement',
    quote:
      'Every USDT transfer on BNB Smart Chain is verified directly against contract logs before crediting our immutable append-only ledger. Zero commingling, total clarity.',
    initials: 'AR',
    author: 'Arjun Rao',
    role: 'Quantitative Portfolio Director, Vertex Alpha',
    metrics: [
      { value: '< 2 min', label: 'Tx verification' },
      { value: 'BEP-20', label: 'Native settlement' },
      { value: '25k+', label: 'Global participants' },
    ],
  },
  {
    eyebrow: 'Sovereign risk controls',
    quote:
      'Role-separated Master Command, real-time solvency proofs, and device-bound session revocation give our compliance team institutional confidence from day one.',
    initials: 'SK',
    author: 'Elena Lindqvist',
    role: 'Chief Risk Officer, Nordik Capital',
    metrics: [
      { value: 'SHA-256', label: 'Session rotation' },
      { value: '6-digit', label: 'OTP verification' },
      { value: '0.00', label: 'Drift tolerance' },
    ],
  },
];

export function AuthSplitLayout({
  mode = 'split', // 'split' | 'solo'
  children,
  footer = null,
  matchedAccount = null, // Optional live DB email recognition object
}) {
  const [slideIdx, setSlideIdx] = React.useState(0);
  const slide = SHOWCASE_SLIDES[slideIdx] || SHOWCASE_SLIDES[0];

  const prevSlide = () =>
    setSlideIdx((i) => (i - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length);
  const nextSlide = () => setSlideIdx((i) => (i + 1) % SHOWCASE_SLIDES.length);

  return (
    <div className={styles.pageShell}>
      {/* Ambient Logo Planetary Orbit Ring */}
      <div className={styles.orbitRingGlow} aria-hidden="true" />

      {/* Top minimal utility navigation */}
      <div className={styles.topUtilityBar}>
        <Link href="/" className={styles.homeBackLink}>
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          <span>Back to {BRAND_CONFIG.name}</span>
        </Link>

        <div className={styles.securityBadgePill}>
          <Lock className="h-3 w-3 shrink-0 text-amber-400" />
          <span className={styles.securityBadgeFull}>
            Unified Gateway · TLS &amp; Double-Entry Protected
          </span>
          <span className={styles.securityBadgeMobile}>TLS &amp; Double-Entry Secured</span>
        </div>
      </div>

      <main className={styles.centerStage}>
        {mode === 'solo' ? (
          <div className={styles.soloCardWrap}>{children}</div>
        ) : (
          <div className={styles.splitFrame}>
            {/* Left Authentication Column */}
            <div className={styles.leftPane}>
              <Link href="/" className={styles.brandTopRow}>
                <div className={styles.brandMonogram}>
                  <Image
                    src="/brand/logo-mark.png"
                    alt={BRAND_CONFIG.name}
                    width={22}
                    height={22}
                    style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                  />
                </div>
                <span className={styles.brandLabel}>{BRAND_CONFIG.name}</span>
                <span className={styles.brandTierTag}>INSTITUTIONAL</span>
              </Link>

              <div className={styles.formContainer}>{children}</div>

              <div className={styles.footerPrompt}>{footer}</div>
            </div>

            {/* Right Showcase / Matched Account Security Column (Desktop Only) */}
            <aside className={styles.rightPane} aria-label="Platform telemetry and security">
              {matchedAccount && matchedAccount.exists ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className={styles.rightEyebrow}>Matched account in database</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Verified DB Record
                    </span>
                  </div>

                  <div className="my-auto py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/15 text-amber-300 shadow-sm">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {matchedAccount.isAdmin
                            ? 'NAVRIX Sovereign Governance'
                            : `${matchedAccount.accountName || 'Investor'}'s USDT Vault`}
                        </div>
                        <div className="text-xs text-slate-400">{matchedAccount.email}</div>
                      </div>
                    </div>

                    <div className="mt-3.5 rounded-xl border border-amber-500/20 bg-slate-950/65 p-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Users className="h-3.5 w-3.5 text-amber-400" />
                            <span>Account tier</span>
                          </div>
                          <div className="mt-1 text-xs font-bold text-white">
                            {matchedAccount.isAdmin ? 'Administrative RBAC' : 'Institutional Vault'}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                            <span>Auth methods</span>
                          </div>
                          <div className="mt-1 text-xs font-bold text-white">
                            {matchedAccount.hasGoogle && matchedAccount.hasPassword
                              ? 'Password + Google'
                              : matchedAccount.hasGoogle
                                ? 'Google OAuth + OTP'
                                : 'Password + Email OTP'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 border-t border-slate-800/80 pt-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          <span>Session policy</span>
                        </div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-200">
                          HttpOnly refresh rotation, revocable per device
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 divide-y divide-slate-800/70 rounded-xl border border-slate-800/70 bg-slate-950/50 text-xs text-slate-300">
                      <div className="flex items-center gap-2.5 px-3 py-2">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>
                          {matchedAccount.emailVerified
                            ? 'Email ownership verified in MySQL registry'
                            : '6-digit OTP verification required on next sign-in'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <span>Double-entry USDT ledger protection active</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                        <span>Sign-in logged with timestamp, IP &amp; device posture</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Real-time lookup from <code className="text-amber-400/90 font-mono">users</code>{' '}
                    table
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.rightEyebrow}>{slide.eyebrow}</div>

                  <div className="my-auto py-3">
                    <p className={styles.quoteText}>&ldquo;{slide.quote}&rdquo;</p>

                    <div className={styles.authorRow}>
                      <div className={styles.authorAvatar}>{slide.initials}</div>
                      <div>
                        <div className="text-xs font-bold text-white">{slide.author}</div>
                        <div className="text-[11px] text-slate-400">{slide.role}</div>
                      </div>
                    </div>

                    <div className={styles.metricsStrip}>
                      {slide.metrics.map((m) => (
                        <div key={m.label}>
                          <div className={styles.metricVal}>{m.value}</div>
                          <div className={styles.metricLabel}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.carouselControls}>
                    <div className={styles.dotsGroup}>
                      {SHOWCASE_SLIDES.map((s, idx) => (
                        <button
                          key={s.author}
                          type="button"
                          aria-label={`Slide ${idx + 1}`}
                          onClick={() => setSlideIdx(idx)}
                          className={`${styles.dotIndicator} ${
                            idx === slideIdx ? styles.dotIndicatorActive : ''
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={prevSlide}
                        aria-label="Previous highlight"
                        className={styles.arrowBtn}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={nextSlide}
                        aria-label="Next highlight"
                        className={styles.arrowBtn}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
