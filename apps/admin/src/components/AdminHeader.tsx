'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Crown, HelpCircle, Menu, Moon, Sun } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button } from '@navrix/ui';
import { startTutorialTour } from './InteractiveTutorialTour';
import styles from './admin-header.module.css';

export interface AdminHeaderProps {
  pathname: string;
  theme: 'dark' | 'light';
  isMaster: boolean;
  onToggleTheme: () => void;
  onOpenMobileMenu: () => void;
}

function resolveAdminTitle(pathname: string): { title: string; subtitle: string } {
  const clean = pathname.replace(/^\/admin/, '') || '/dashboard';
  if (clean.startsWith('/master')) {
    return {
      title: 'Master Sovereign Command',
      subtitle: 'Double-Entry Solvency & Circuit Breakers',
    };
  }
  if (clean.startsWith('/deposits')) {
    return { title: 'Deposits Verification Queue', subtitle: 'On-Chain BEP-20 Receipt Inspection' };
  }
  if (clean.startsWith('/withdrawals')) {
    return { title: 'Withdrawals Settlement Queue', subtitle: 'Outbound Payout Processing' };
  }
  if (clean.startsWith('/investments')) {
    return { title: 'Investment Vaults Registry', subtitle: 'Active Customer Allocations' };
  }
  if (clean.startsWith('/interest')) {
    return { title: 'Interest Distribution Engine', subtitle: 'Idempotent Yield Accrual Runner' };
  }
  if (clean.startsWith('/users')) {
    return { title: 'Customer Accounts', subtitle: 'Investor Directory & Account Status' };
  }
  if (clean.startsWith('/ledger')) {
    return {
      title: 'Immutable Double-Entry Ledger',
      subtitle: 'Platform-Wide Append-Only Journal',
    };
  }
  if (clean.startsWith('/blockchain-transactions')) {
    return { title: 'Blockchain Transactions', subtitle: 'Verified BSC ERC-20 Transfer Logs' };
  }
  if (clean.startsWith('/audit-logs')) {
    return { title: 'Executive Audit Trail', subtitle: 'Tamper-Evident Administrative Events' };
  }
  if (clean.startsWith('/admin-users')) {
    return { title: 'Admin RBAC Governance', subtitle: 'Operator Role & Privilege Control' };
  }
  if (clean.startsWith('/settings')) {
    return { title: 'Platform System Settings', subtitle: 'Runtime Thresholds & Vault Parameters' };
  }
  return { title: 'Operations Command Deck', subtitle: 'Live MySQL Treasury & 24h SLA Telemetry' };
}

export function AdminHeader({
  pathname,
  theme,
  isMaster,
  onToggleTheme,
  onOpenMobileMenu,
}: AdminHeaderProps) {
  const meta = resolveAdminTitle(pathname);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className={styles.mobileMenuBtn}
          aria-label="Open admin menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Link href="/admin/dashboard" className={styles.mobileLogo}>
          <Image src="/brand/logo-mark.png" alt={BRAND_CONFIG.name} width={24} height={24} />
        </Link>

        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>{meta.title}</h1>
          <span className={styles.pageSub}>{meta.subtitle}</span>
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.rbacPill}>
          <span className={styles.liveDot} />
          <span className={styles.rbacFull}>RBAC · MySQL Audit Live</span>
          <span className={styles.rbacShort}>Audit Live</span>
        </span>

        <button
          type="button"
          onClick={() => startTutorialTour(0)}
          className={styles.iconBtn}
          aria-label="Start Interactive Operator Tour"
          title="Start Interactive Operator Tour"
        >
          <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className={styles.iconBtn}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-3.5 w-3.5 text-amber-400" />
          ) : (
            <Moon className="h-3.5 w-3.5 text-slate-700" />
          )}
        </button>

        {isMaster ? (
          <Link href="/admin/master" className={styles.masterCtaWrap}>
            <Button variant="gold" size="sm" className={styles.compactCta}>
              <Crown className="h-3.5 w-3.5" />
              Master
            </Button>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
