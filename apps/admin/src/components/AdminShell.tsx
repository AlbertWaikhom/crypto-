'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Blocks,
  Coins,
  Crown,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Settings,
  ShieldAlert,
  Sun,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { isAdminRole, isMasterAdminRole } from '@navrix/types';
import { Button, cn } from '@navrix/ui';
import { useAdminStore } from '../store/admin-store';
import { adminApi } from '../lib/api';
import styles from './admin-shell.module.css';

const ADMIN_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, masterOnly: false },
  { href: '/master', label: 'Master Command', icon: Crown, masterOnly: true },
  { href: '/deposits', label: 'Deposits Queue', icon: ArrowDownToLine, masterOnly: false },
  { href: '/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine, masterOnly: false },
  { href: '/investments', label: 'Investments', icon: TrendingUp, masterOnly: false },
  { href: '/interest', label: 'Interest Engine', icon: Coins, masterOnly: false },
  { href: '/users', label: 'Users', icon: Users, masterOnly: false },
  { href: '/ledger', label: 'Immutable Ledger', icon: FileSpreadsheet, masterOnly: false },
  {
    href: '/blockchain-transactions',
    label: 'Blockchain Txs',
    icon: Blocks,
    masterOnly: false,
  },
  { href: '/audit-logs', label: 'Audit Logs', icon: ScrollText, masterOnly: false },
  { href: '/admin-users', label: 'Admin Users', icon: ShieldAlert, masterOnly: true },
  { href: '/settings', label: 'System Settings', icon: Settings, masterOnly: true },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    theme,
    toggleTheme,
    accessToken,
    user,
    hydrated,
    mobileOpen,
    setMobileOpen,
    clearAdminSession,
  } = useAdminStore();

  React.useEffect(() => {
    if (hydrated && (!accessToken || !user || !isAdminRole(user.role))) {
      clearAdminSession();
      router.replace('/login');
    }
  }, [hydrated, accessToken, user, clearAdminSession, router]);

  const handleLogout = async () => {
    try {
      await adminApi('/auth/logout', { method: 'POST' }, false);
    } catch {
      // ignore
    }
    clearAdminSession();
    router.replace('/login');
  };

  if (!hydrated || !accessToken || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  const isMaster = isMasterAdminRole(user.role);

  return (
    <div className={styles.shell}>
      <aside className={cn(styles.sidebar, mobileOpen && styles.sidebarOpen)}>
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image
                src="/brand/logo-mark.png"
                alt={BRAND_CONFIG.name}
                width={36}
                height={36}
                priority
              />
              <div>
                <div className="text-base font-extrabold tracking-widest">
                  {BRAND_CONFIG.name}
                </div>
                <div className="text-[10px] font-bold tracking-wider text-amber-400">
                  {isMaster ? 'MASTER COMMAND' : 'OPERATIONS CONSOLE'}
                </div>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 opacity-70"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className={styles.navList}>
            {ADMIN_LINKS.filter((l) => !l.masterOnly || isMaster).map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(styles.navLink, active && styles.navLinkActive)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4 space-y-2.5">
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-amber-400">
                {user.uid}
              </span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                {user.role}
              </span>
            </div>
            <div className="mt-1 truncate text-xs font-bold">{user.name}</div>
            <div className="truncate text-[11px] opacity-65">{user.email}</div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-rose-400"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex flex-col min-w-0">
        <header className={styles.topbar}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={cn(
                styles.mobileMenuBtn,
                'rounded-lg border border-slate-700 p-2',
              )}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              RBAC Enforced · Audit Trail Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl border border-slate-700/60 p-2"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>
            {isMaster ? (
              <Link href="/master">
                <Button variant="gold" size="sm">
                  <Crown className="h-3.5 w-3.5" />
                  Master Monitor
                </Button>
              </Link>
            ) : null}
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

