'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  LayoutDashboard,
  Menu,
  Moon,
  ShieldCheck,
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

export function SiteHeader({
  mode = 'sticky',
  compactAuth = false,
}: SiteHeaderProps) {
  const { theme, toggleTheme, accessToken, user } = useUiStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
        mode === 'sticky' ? styles.modeSticky : styles.modeStatic,
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
          <span className={styles.chainChip}>
            <span className={styles.liveDot} />
            <span>BSC · BEP-20 USDT</span>
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
                    Get Started
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
                    Create Investor Account
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

