'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  FileLock2,
  Moon,
  QrCode,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import {
  BLOCKCHAIN_DEFAULTS,
  BRAND_CONFIG,
  COMPLIANCE_DISCLOSURES,
} from '@navrix/config';
import { Button } from '@navrix/ui';
import { useUiStore } from '../store/ui-store';
import styles from './landing.module.css';

const ARCHITECTURE_PILLARS = [
  {
    icon: Blocks,
    title: 'On-Chain Receipt Verification',
    description:
      'Every BEP-20 USDT deposit is verified directly against BNB Smart Chain transaction receipts, ERC-20 Transfer logs, and block confirmations.',
  },
  {
    icon: FileLock2,
    title: 'Immutable Double-Entry Ledger',
    description:
      'Balances are never mutated arbitrarily. Every deposit, yield accrual, and withdrawal generates an append-only auditable ledger entry.',
  },
  {
    icon: ShieldCheck,
    title: '24-Hour Compliance & Dual Review',
    description:
      'Multi-tier operational governance separates customer submission, automated chain detection, and authorized administrative sign-off.',
  },
];

export default function LandingPage() {
  const { theme, toggleTheme, accessToken } = useUiStore();

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className="flex items-center gap-3">
          <Image
            src="/brand/logo-mark.png"
            alt={BRAND_CONFIG.name}
            width={42}
            height={42}
            priority
          />
          <div>
            <div className="text-lg font-extrabold tracking-widest">
              {BRAND_CONFIG.name}
            </div>
            <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400">
              {BRAND_CONFIG.motto}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl border border-slate-700/50 p-2.5 hover:border-amber-500/50"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>
          {accessToken ? (
            <Link href="/dashboard">
              <Button variant="gold" size="md">
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="md">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="gold" size="md">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <span className={styles.pill}>
            <QrCode className="h-3.5 w-3.5" />
            {BLOCKCHAIN_DEFAULTS.networkDisplayName} · USDT Architecture
          </span>

          <h1 className={styles.headline}>
            {BRAND_CONFIG.name}:{' '}
            <span className={styles.goldGradient}>{BRAND_CONFIG.tagline}</span>
          </h1>

          <p className={styles.subcopy}>{BRAND_CONFIG.subTagline}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={accessToken ? '/deposit' : '/register'}>
              <Button variant="gold" size="lg">
                Start USDT Deposit
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Investor Portal Sign In
              </Button>
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs opacity-85">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Zero Private Keys Stored</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>ERC-20 Transfer Log Parsing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Append-Only MySQL Ledger</span>
            </div>
          </div>
        </div>

        <div className={styles.heroCard}>
          <Image
            src="/brand/logo-full.png"
            alt={`${BRAND_CONFIG.name} Official Emblem`}
            width={300}
            height={260}
            priority
            className="object-contain"
          />
          <div className="mt-6 w-full rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs">
            <div className="flex items-center justify-between font-semibold text-amber-400">
              <span>Supported Asset</span>
              <span>USDT (BEP-20)</span>
            </div>
            <div className="mt-2 flex items-center justify-between opacity-80">
              <span>Settlement Chain</span>
              <span>BNB Smart Chain</span>
            </div>
            <div className="mt-2 flex items-center justify-between opacity-80">
              <span>Verification Source</span>
              <span>Authoritative Tx Hash</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.featuresSection}>
        <h2 className="text-2xl font-bold">
          Engineered for Verifiable Financial Integrity
        </h2>
        <div className={styles.featureGrid}>
          {ARCHITECTURE_PILLARS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={styles.featureCard}>
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-75">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className="font-semibold text-amber-400 mb-1">
          Risk & Compliance Notice
        </div>
        <p>{COMPLIANCE_DISCLOSURES.regulatoryDisclaimer}</p>
        <p className="mt-3 opacity-60">
          © {new Date().getFullYear()} {BRAND_CONFIG.name}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

