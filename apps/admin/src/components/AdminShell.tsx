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
  ScrollText,
  Settings,
  ShieldAlert,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { isAdminRole, isMasterAdminRole } from '@navrix/types';
import {
  Button,
  cn,
  DecryptedText,
  MobileDock,
  type MobileDockItem,
} from '@navrix/ui';
import { useAdminStore } from '../store/admin-store';
import { adminApi } from '../lib/api';
import { AdminHeader } from './AdminHeader';
import styles from './admin-shell.module.css';

const UNIFIED_LOGIN_URL =
  (process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000') + '/login?portal=admin';

interface AdminNavGroup {
  heading: string;
  items: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    masterOnly: boolean;
  }>;
}

const ADMIN_GROUPS: AdminNavGroup[] = [
  {
    heading: 'Command',
    items: [
      { href: '/dashboard', label: 'Ops Deck', icon: LayoutDashboard, masterOnly: false },
      { href: '/master', label: 'Master Command', icon: Crown, masterOnly: true },
    ],
  },
  {
    heading: 'Treasury Ops',
    items: [
      { href: '/deposits', label: 'Deposits Queue', icon: ArrowDownToLine, masterOnly: false },
      { href: '/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine, masterOnly: false },
      { href: '/investments', label: 'Investments', icon: TrendingUp, masterOnly: false },
      { href: '/interest', label: 'Interest Engine', icon: Coins, masterOnly: false },
    ],
  },
  {
    heading: 'Ledger & Audit',
    items: [
      { href: '/users', label: 'Customers', icon: Users, masterOnly: false },
      { href: '/ledger', label: 'Double-Entry Ledger', icon: FileSpreadsheet, masterOnly: false },
      {
        href: '/blockchain-transactions',
        label: 'On-Chain Verifier',
        icon: Blocks,
        masterOnly: false,
      },
      { href: '/audit-logs', label: 'Audit Trail', icon: ScrollText, masterOnly: false },
    ],
  },
  {
    heading: 'Governance',
    items: [
      { href: '/admin-users', label: 'Admin RBAC', icon: ShieldAlert, masterOnly: true },
      { href: '/settings', label: 'System Params', icon: Settings, masterOnly: true },
    ],
  },
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
      window.location.replace(UNIFIED_LOGIN_URL);
    }
  }, [hydrated, accessToken, user, clearAdminSession]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, setMobileOpen]);

  const handleLogout = async () => {
    setMobileOpen(false);
    try {
      await adminApi('/auth/logout', { method: 'POST' }, false);
    } catch {
      // ignore
    }
    clearAdminSession();
    window.location.replace(UNIFIED_LOGIN_URL);
  };

  if (!hydrated || !accessToken || !user) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  const isMaster = isMasterAdminRole(user.role);
  const isRouteActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const dockItems: MobileDockItem[] = [
    {
      id: 'ops',
      label: 'Ops Deck',
      icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
      active: isRouteActive('/dashboard'),
      onSelect: () => {
        setMobileOpen(false);
        router.push('/dashboard');
      },
    },
    isMaster
      ? {
          id: 'master',
          label: 'Master',
          icon: <Crown className="h-[18px] w-[18px]" />,
          active: isRouteActive('/master'),
          onSelect: () => {
            setMobileOpen(false);
            router.push('/master');
          },
        }
      : {
          id: 'users',
          label: 'Users',
          icon: <Users className="h-[18px] w-[18px]" />,
          active: isRouteActive('/users'),
          onSelect: () => {
            setMobileOpen(false);
            router.push('/users');
          },
        },
    {
      id: 'deposits',
      label: 'Deposits',
      icon: <ArrowDownToLine className="h-[18px] w-[18px]" />,
      active: isRouteActive('/deposits'),
      onSelect: () => {
        setMobileOpen(false);
        router.push('/deposits');
      },
    },
    {
      id: 'withdrawals',
      label: 'Payouts',
      icon: <ArrowUpFromLine className="h-[18px] w-[18px]" />,
      active: isRouteActive('/withdrawals'),
      onSelect: () => {
        setMobileOpen(false);
        router.push('/withdrawals');
      },
    },
    {
      id: 'more',
      label: 'Console',
      icon: <Menu className="h-[18px] w-[18px]" />,
      active:
        mobileOpen ||
        isRouteActive('/investments') ||
        isRouteActive('/interest') ||
        isRouteActive('/ledger') ||
        isRouteActive('/blockchain-transactions') ||
        isRouteActive('/audit-logs') ||
        isRouteActive('/admin-users') ||
        isRouteActive('/settings'),
      onSelect: () => setMobileOpen(!mobileOpen),
    },
  ];

  return (
    <div className={styles.shell}>
      {mobileOpen ? (
        <div
          className={styles.scrim}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Visually Separated Fixed Admin Sidebar Panel */}
      <aside
        className={cn(styles.sidebar, mobileOpen && styles.sidebarOpen)}
        aria-label="Administrative Navigation"
      >
        <div className={styles.brandHeader}>
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={styles.brandRow}
          >
            <div className={styles.logoFrame}>
              <Image
                src="/brand/logo-mark.png"
                alt={BRAND_CONFIG.name}
                width={26}
                height={26}
                priority
              />
            </div>
            <div>
              <div className={styles.brandTitle}>{BRAND_CONFIG.name}</div>
              <div className={styles.brandRoleSub}>
                {isMaster ? 'MASTER COMMAND' : 'OPS CONSOLE'}
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className={styles.closeBtn}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={styles.navScrollArea}>
          {ADMIN_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (i) => !i.masterOnly || isMaster,
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.heading} className={styles.navGroup}>
                <div className={styles.navGroupTitle}>{group.heading}</div>
                <nav className={styles.navList}>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isRouteActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          styles.navLink,
                          active && styles.navLinkActive,
                        )}
                      >
                        <Icon className="h-[15px] w-[15px] shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.operatorCard}>
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold text-amber-400">
                <DecryptedText text={user.uid} />
              </span>
              <span className={styles.roleTag}>{user.role}</span>
            </div>
            <div className="mt-0.5 truncate text-xs font-bold">{user.name}</div>
            <div className="truncate text-[10px] opacity-60">{user.email}</div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={styles.logoutBtn}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Visually Separated Right Workspace Panel */}
      <div className={styles.workspacePanel}>
        <AdminHeader
          pathname={pathname}
          theme={theme}
          isMaster={isMaster}
          onToggleTheme={toggleTheme}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        <main className={styles.contentScrollArea}>
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>

      <div className={styles.mobileDockWrap}>
        <MobileDock items={dockItems} dockId="nv-admin-dock" />
      </div>
    </div>
  );
}
