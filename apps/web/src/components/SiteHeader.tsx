'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  ChevronDown,
  Layers,
  LayoutDashboard,
  Lock,
  Menu,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { isAdminRole, isMasterAdminRole } from '@navrix/types';
import { Button, cn } from '@navrix/ui';
import { useUiStore } from '../store/ui-store';
import styles from './site-header.module.css';

export interface SiteHeaderProps {
  mode?: 'sticky' | 'static';
  compactAuth?: boolean;
}

const ADMIN_BASE_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/ecosystem', label: 'NAVRIX Ecosystem' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader({
  mode = 'sticky',
  compactAuth = false,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme, accessToken, user } = useUiStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const workspaceHref = React.useMemo(() => {
    if (!accessToken || !user) return '/dashboard';
    if (isMasterAdminRole(user.role)) return `${ADMIN_BASE_URL}/master`;
    if (isAdminRole(user.role)) return `${ADMIN_BASE_URL}/dashboard`;
    return '/dashboard';
  }, [accessToken, user]);

  return (
    <>
      <header
        className={cn(
          styles.headerWrapper,
          mode === 'static' ? styles.wrapperStatic : styles.wrapperFixed,
          isScrolled && mode === 'sticky' ? styles.wrapperScrolled : styles.wrapperTop,
        )}
      >
        <div className={styles.pillContainer}>
          {/* Brand Monogram & Title */}
          <Link
            href="/"
            className={styles.brandLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className={styles.brandIconTile}>
              <Image
                src="/brand/logo-mark.png"
                alt={BRAND_CONFIG.name}
                width={28}
                height={28}
                priority
              />
            </div>
            <div className={styles.brandMeta}>
              <span className={styles.brandTitle}>{BRAND_CONFIG.name}</span>
              <span className={styles.brandSubtitle}>FINANCIAL ECOSYSTEM</span>
            </div>
          </Link>

          {/* Desktop Center Pill Navigation */}
          {!compactAuth && (
            <nav className={styles.centerNav}>
              {NAV_LINKS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      styles.navPillLink,
                      isActive && styles.navPillActive,
                    )}
                  >
                    <span>{item.label}</span>
                    {isActive && <span className={styles.activeDot} />}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Action Cluster */}
          <div className={styles.rightCluster}>
            <button
              type="button"
              onClick={toggleTheme}
              className={styles.iconThemeBtn}
              title={`Switch to ${mounted && theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle Theme"
              suppressHydrationWarning
            >
              {mounted && theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {mounted && accessToken ? (
              <Link href={workspaceHref}>
                <Button
                  size="sm"
                  className={styles.ctaPrimaryBtn}
                >
                  <LayoutDashboard size={14} className="mr-1 text-amber-950" />
                  <span>Dashboard</span>
                  <ArrowRight size={13} className="ml-1 opacity-70" />
                </Button>
              </Link>
            ) : (
              <div className={styles.authGroup}>
                <Link
                  href="/login"
                  className={styles.loginGhostLink}
                >
                  <Lock size={12} className="opacity-60" />
                  <span>Login / Signup</span>
                </Link>

                <Link href="/login">
                  <Button
                    size="sm"
                    className={styles.ctaPrimaryBtn}
                  >
                    <span>Partner With NAVRIX</span>
                    <ArrowRight size={13} className="ml-1 opacity-80" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            {!compactAuth && (
              <button
                type="button"
                className={styles.mobileMenuToggle}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Sheet */}
        {mobileMenuOpen && !compactAuth && (
          <div className={styles.mobileSheet}>
            <nav className={styles.mobileNavLinks}>
              {NAV_LINKS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      styles.mobileNavLinkItem,
                      isActive && styles.mobileNavActive,
                    )}
                  >
                    <span>{item.label}</span>
                    <ArrowRight size={14} className="opacity-40" />
                  </Link>
                );
              })}
            </nav>

            <div className={styles.mobileAuthActions}>
              {accessToken ? (
                <Link
                  href={workspaceHref}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button className={styles.mobileActionBtn}>
                    <LayoutDashboard size={16} className="mr-2" />
                    Open Command Workspace
                  </Button>
                </Link>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="outline"
                      className="w-full text-xs font-semibold"
                    >
                      <Lock size={13} className="mr-1.5 opacity-60" />
                      Client Login / Signup
                    </Button>
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button className={styles.mobileActionBtn}>
                      Partner With NAVRIX
                      <ArrowRight size={14} className="ml-1.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Spacer to prevent fixed header from overlapping top page content */}
      {mode === 'sticky' && <div className={styles.fixedSpacer} />}
    </>
  );
}

export default SiteHeader;
