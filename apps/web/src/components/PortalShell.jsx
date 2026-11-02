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
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { isAdminRole, isMasterAdminRole } from '@navrix/types';
import { Button, cn, DecryptedText, MobileDock } from '@navrix/ui';
import { useUiStore } from '../store/ui-store';
import { apiRequest } from '../lib/api';
import { PortalHeader } from './PortalHeader';
import styles from './portal-shell.module.css';
const ADMIN_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
const NAV_GROUPS = [
  {
    heading: 'Portfolio',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/investments', label: 'Vault Plans', icon: TrendingUp },
      { href: '/interest-history', label: 'Yield Credits', icon: Coins },
    ],
  },
  {
    heading: 'Treasury',
    items: [
      { href: '/deposit', label: 'Deposit USDT', icon: ArrowDownToLine },
      { href: '/withdraw', label: 'Withdraw USDT', icon: ArrowUpFromLine },
      { href: '/transactions', label: 'Audit Ledger', icon: FileSpreadsheet },
    ],
  },
  {
    heading: 'Governance',
    items: [
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/profile', label: 'Profile & KYC', icon: UserCheck },
      { href: '/security', label: 'Security', icon: ShieldCheck },
    ],
  },
];
export function PortalShell({ children }) {
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
    if (!hydrated) return;
    if (!accessToken || !user) {
      router.replace('/login');
      return;
    }
    if (isAdminRole(user.role)) {
      const target = isMasterAdminRole(user.role) ? '/master' : '/dashboard';
      const hash = `token=${encodeURIComponent(accessToken)}&user=${encodeURIComponent(JSON.stringify(user))}&target=${encodeURIComponent(target)}`;
      window.location.replace(`${ADMIN_BASE_URL}/sso#${hash}`);
    }
  }, [hydrated, accessToken, user, router]);
  React.useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen, setMobileNavOpen]);
  const { data: notifData } = useQuery({
    queryKey: ['notifications-badge'],
    queryFn: () => apiRequest('/notifications?limit=5'),
    enabled: Boolean(accessToken && user && !isAdminRole(user.role)),
  });
  const unreadCount = notifData?.unreadCount ?? 0;
  const handleLogout = async () => {
    setMobileNavOpen(false);
    try {
      await apiRequest('/auth/logout', { method: 'POST' }, false);
    } catch {
      // ignore network error
    }
    clearSession();
    router.replace('/login');
  };
  if (!hydrated || !accessToken || !user || isAdminRole(user.role)) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }
  const isRouteActive = (href) => pathname === href || pathname.startsWith(`${href}/`);
  const dockItems = [
    {
      id: 'dashboard',
      label: 'Portfolio',
      icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
      active: isRouteActive('/dashboard'),
      onSelect: () => {
        setMobileNavOpen(false);
        router.push('/dashboard');
      },
    },
    {
      id: 'deposit',
      label: 'Deposit',
      icon: <ArrowDownToLine className="h-[18px] w-[18px]" />,
      active: isRouteActive('/deposit'),
      onSelect: () => {
        setMobileNavOpen(false);
        router.push('/deposit');
      },
    },
    {
      id: 'investments',
      label: 'Vaults',
      icon: <TrendingUp className="h-[18px] w-[18px]" />,
      active: isRouteActive('/investments') || isRouteActive('/interest-history'),
      onSelect: () => {
        setMobileNavOpen(false);
        router.push('/investments');
      },
    },
    {
      id: 'withdraw',
      label: 'Withdraw',
      icon: <ArrowUpFromLine className="h-[18px] w-[18px]" />,
      active: isRouteActive('/withdraw'),
      onSelect: () => {
        setMobileNavOpen(false);
        router.push('/withdraw');
      },
    },
    {
      id: 'more',
      label: 'More',
      icon: <Menu className="h-[18px] w-[18px]" />,
      active:
        mobileNavOpen ||
        isRouteActive('/transactions') ||
        isRouteActive('/notifications') ||
        isRouteActive('/profile') ||
        isRouteActive('/security'),
      badge: unreadCount,
      onSelect: () => setMobileNavOpen(!mobileNavOpen),
    },
  ];
  return (
    <div className={styles.shell}>
      {mobileNavOpen ? (
        <div className={styles.scrim} onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      ) : null}

      {/* Visually Separated Fixed Sidebar Panel */}
      <aside
        className={cn(styles.sidebar, mobileNavOpen && styles.sidebarOpen)}
        aria-label="Customer Navigation"
      >
        <div className={styles.brandHeader}>
          <Link
            href="/dashboard"
            onClick={() => setMobileNavOpen(false)}
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
              <div className={styles.brandName}>{BRAND_CONFIG.name}</div>
              <div className={styles.brandSub}>{BRAND_CONFIG.motto}</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className={styles.closeBtn}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={styles.navScrollArea}>
          {NAV_GROUPS.map((group) => (
            <div key={group.heading} className={styles.navGroup}>
              <div className={styles.navGroupTitle}>{group.heading}</div>
              <nav className={styles.navList}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={cn(styles.navItem, active && styles.navItemActive)}
                    >
                      <Icon className="h-[15px] w-[15px] shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.href === '/notifications' && unreadCount > 0 ? (
                        <span className={styles.badgePill}>{unreadCount}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold text-amber-400">
                <DecryptedText text={user.uid || 'USR-000000'} />
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                <Sparkles className="h-2.5 w-2.5" />
                ACTIVE
              </span>
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

      {/* Visually Separated Main Workspace Container (Static Header + Inner Scroll Only) */}
      <div className={styles.workspacePanel}>
        <PortalHeader
          pathname={pathname}
          theme={theme}
          unreadCount={unreadCount}
          onToggleTheme={toggleTheme}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className={styles.contentScrollArea}>
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>

      <div className={styles.mobileDockWrap}>
        <MobileDock items={dockItems} dockId="nv-portal-dock" />
      </div>
    </div>
  );
}
