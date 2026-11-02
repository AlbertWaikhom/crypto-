'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Layers,
  LayoutDashboard,
  Lock,
  Menu,
  Moon,
  Pin,
  ShieldCheck,
  Sun,
  Unlock,
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

export function SiteHeader({
  mode: initialMode = 'sticky',
  compactAuth = false,
}: SiteHeaderProps) {
  const { theme, toggleTheme, accessToken, user } = useUiStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [currentMode, setCurrentMode] = React.useState<'sticky' | 'static'>(
    initialMode,
  );
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode]);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleHeaderMode = () => {
    setCurrentMode((prev) => (prev === 'sticky' ? 'static' : 'sticky'));
  };

  const workspaceHref = React.useMemo(() => {
    if (!accessToken || !user) return '/dashboard';
    if (isMasterAdminRole(user.role)) return `${ADMIN_BASE_URL}/master`;
    if (isAdminRole(user.role)) return `${ADMIN_BASE_URL}/dashboard`;
    return '/dashboard';
  }, [accessToken, user]);

  return (
    <header
      className={cn(
        styles.headerRoot,
        currentMode === 'sticky' ? styles.modeSticky : styles.modeStatic,
        isScrolled && currentMode === 'sticky'
          ? styles.stickyScrolled
          : styles.staticTop,
      )}
    >
      <div className={styles.innerBar}>
        <div className={styles.leftCluster}>
          <Link
            href="/"
            className={styles.brandLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className={styles.logoTile}>
              <Image
                src="/brand/logo-mark.png"
                alt={BRAND_CONFIG.name}
                width={30}
                height={30}
                priority
              />
            </div>
            <div>
              <div className={styles.brandTitle}>{BRAND_CONFIG.name}</div>
              <div className={styles.brandMotto}>{BRAND_CONFIG.motto}</div>
            </div>
          </Link>

          {!compactAuth ? (
            <nav className={styles.desktopNav} aria-label="Primary Site Navigation">
              <Link href="/" className={styles.navAnchor}>
                Home
              </Link>
              <Link href="/about" className={styles.navAnchor}>
                About
              </Link>
              <Link href="/ecosystem" className={styles.navAnchor}>
                NAVRIX Ecosystem
              </Link>
              <Link href="/contact" className={styles.navAnchor}>
                Contact
              </Link>
            </nav>
          ) : null}
        </div>

        <div className={styles.rightCluster}>
          {/* Header Sticky / Static Mode Pill Toggle */}
          <button
            type="button"
            onClick={toggleHeaderMode}
            className={styles.modeToggleBtn}
            title={`Currently in ${currentMode.toUpperCase()} mode. Click to toggle to ${
              currentMode === 'sticky' ? 'static' : 'sticky'
            } mode.`}
          >
            {currentMode === 'sticky' ? (
              <Pin className="h-3 w-3 text-amber-400" />
            ) : (
              <Unlock className="h-3 w-3 text-slate-400" />
            )}
            <span>{currentMode.toUpperCase()}</span>
          </button>

          <span className={styles.chainChip}>
            <span className={styles.liveDot} />
            <span className="hidden sm:inline">BSC · BEP-20 USDT</span>
            <span className="sm:hidden">BSC</span>
          </span>

          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeBtn}
            aria-label="Toggle dark/light theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          <div className={styles.desktopActions}>
            {accessToken && user ? (
              <Link href={workspaceHref}>
                <Button variant="gold" size="sm">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Open Workspace
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                    Unified Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="gold" size="sm">
                    Partner With {BRAND_CONFIG.name}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className={styles.mobileBurger}
            aria-label="Toggle site menu"
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className={styles.mobileSheet}>
          {!compactAuth ? (
            <div className={styles.mobileLinks}>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={styles.mobileAnchor}
              >
                Home
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className={styles.mobileAnchor}
              >
                About
              </Link>
              <Link
                href="/ecosystem"
                onClick={() => setMobileMenuOpen(false)}
                className={styles.mobileAnchor}
              >
                NAVRIX Ecosystem
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={styles.mobileAnchor}
              >
                Contact
              </Link>
            </div>
          ) : null}

          <div className={styles.mobileCtas}>
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 text-xs">
              <span className="text-slate-400">Header Position Mode:</span>
              <button
                type="button"
                onClick={toggleHeaderMode}
                className={styles.modeToggleBtn}
              >
                <span>{currentMode.toUpperCase()}</span>
              </button>
            </div>

            {accessToken && user ? (
              <Link
                href={workspaceHref}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button variant="gold" size="sm" className="w-full">
                  Open Workspace
                </Button>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="secondary" size="sm" className="w-full">
                    Unified Sign In (User & Admin)
                  </Button>
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="gold" size="sm" className="w-full">
                    Partner With {BRAND_CONFIG.name}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
