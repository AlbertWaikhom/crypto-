'use client';
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDownToLine, Bell, HelpCircle, Menu } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button } from '@navrix/ui';
import { startTutorialTour } from './InteractiveTutorialTour';
import styles from './portal-header.module.css';
function resolvePortalTitle(pathname) {
  if (pathname.startsWith('/deposit')) {
    return { title: 'BEP-20 USDT Deposit', subtitle: 'QR Settlement & On-Chain Verification' };
  }
  if (pathname.startsWith('/investments')) {
    return { title: 'Investment Vaults', subtitle: 'Active Principal & Maturity Schedules' };
  }
  if (pathname.startsWith('/interest-history')) {
    return { title: 'Yield & Interest Ledger', subtitle: 'Immutable Profit Accruals' };
  }
  if (pathname.startsWith('/withdraw')) {
    return { title: 'USDT Withdrawals', subtitle: 'Balance-Locked Outbound Payouts' };
  }
  if (pathname.startsWith('/transactions')) {
    return { title: 'Immutable Double-Entry Ledger', subtitle: 'Complete Financial Audit Trail' };
  }
  if (pathname.startsWith('/notifications')) {
    return { title: 'Notifications', subtitle: 'System & Settlement Alerts' };
  }
  if (pathname.startsWith('/profile') || pathname.startsWith('/settings')) {
    return {
      title: 'Settings & Preferences',
      subtitle: 'Account Identity, Payout Wallet & Controls',
    };
  }
  if (pathname.startsWith('/security')) {
    return { title: 'Security & Sessions', subtitle: 'Password & Active Token Governance' };
  }
  return { title: 'Portfolio Command', subtitle: 'Real-Time Double-Entry USDT Vault' };
}
export function PortalHeader({ pathname, unreadCount, onOpenMobileNav }) {
  const meta = resolvePortalTitle(pathname);
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          onClick={onOpenMobileNav}
          className={styles.mobileMenuBtn}
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Link href="/dashboard" className={styles.mobileLogo}>
          <Image src="/brand/logo-mark.png" alt={BRAND_CONFIG.name} width={24} height={24} />
        </Link>

        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>{meta.title}</h1>
          <span className={styles.pageSub}>{meta.subtitle}</span>
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.networkPill}>
          <span className={styles.liveDot} />
          <span className={styles.netFull}>BNB Smart Chain · BEP-20</span>
          <span className={styles.netShort}>BEP-20</span>
        </span>

        <Link href="/notifications" className={styles.iconBtn} aria-label="Notifications">
          <Bell className="h-3.5 w-3.5" />
          {unreadCount > 0 ? (
            <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          ) : null}
        </Link>

        <button
          type="button"
          onClick={() => startTutorialTour(0)}
          className={styles.iconBtn}
          aria-label="Start Interactive Tutorial Tour"
          title="Start Interactive Tutorial Tour"
        >
          <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
        </button>

        <Link href="/deposit" className={styles.ctaWrap}>
          <Button variant="gold" size="sm" className={styles.compactCta}>
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Deposit
          </Button>
        </Link>
      </div>
    </header>
  );
}
