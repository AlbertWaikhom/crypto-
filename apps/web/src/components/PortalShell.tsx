'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  Coins,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button, cn } from '@navrix/ui';
import { useUiStore } from '../store/ui-store';
import { apiRequest } from '../lib/api';
import styles from './portal-shell.module.css';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/deposit', label: 'Deposit USDT', icon: ArrowDownToLine },
  { href: '/investments', label: 'Investments', icon: TrendingUp },
  { href: '/interest-history', label: 'Interest History', icon: Coins },
  { href: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { href: '/transactions', label: 'Ledger History', icon: FileSpreadsheet },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/profile', label: 'Profile & Compliance', icon: UserCheck },
  { href: '/security', label: 'Security & Sessions', icon: ShieldCheck },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    theme,
    toggleTheme,
    user,
    accessToken,
    hydrated,
    mobileNavOpen,
    setMobileNavOpen,
    clearSession,
  } = useUiStore();

  React.useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/login');
    }
  }, [hydrated, accessToken, router]);

  const { data: notifData } = useQuery({
    queryKey: ['notifications-badge'],
    queryFn: () =>
      apiRequest<{ unreadCount: number; items: Array<{ id: string }> }>(
        '/notifications?limit=5',
      ),
    enabled: Boolean(accessToken),
  });

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' }, false);
    } catch {
      // Ignore logout network error
    }
    clearSession();
    router.replace('/login');
  };

  if (!hydrated || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <aside
        className={cn(styles.sidebar, mobileNavOpen && styles.sidebarOpen)}
        aria-label="Customer Navigation"
      >
        <div>
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className={styles.brandRow}>
              <Image
                src="/brand/logo-mark.png"
                alt={BRAND_CONFIG.name}
                width={38}
                height={38}
                priority
              />
              <div>
                <div className={styles.brandName}>{BRAND_CONFIG.name}</div>
                <div className={styles.brandSub}>{BRAND_CONFIG.motto}</div>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden p-1.5 opacity-70 hover:opacity-100"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className={styles.navList}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(styles.navItem, active && styles.navItemActive)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.href === '/notifications' &&
                  (notifData?.unreadCount ?? 0) > 0 ? (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-slate-950">
                      {notifData?.unreadCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className="text-xs font-mono text-amber-400">
              {user?.uid || 'USR-000000'}
            </div>
            <div className="truncate text-sm font-semibold">{user?.name}</div>
            <div className="truncate text-xs opacity-65">{user?.email}</div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-rose-400 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className={cn(
                styles.mobileToggle,
                'rounded-lg border border-slate-700/60 p-2',
              )}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                BNB Smart Chain (BEP-20 USDT)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl border border-slate-700/50 p-2.5 transition hover:border-amber-500/50"
              aria-label="Toggle dark/light theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>
            <Link href="/deposit">
              <Button variant="gold" size="sm">
                <ArrowDownToLine className="h-4 w-4" />
                Deposit USDT
              </Button>
            </Link>
          </div>
        </header>

        <main className={styles.contentArea}>{children}</main>
      </div>
    </div>
  );
}

