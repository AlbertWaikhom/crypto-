'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  ChevronDown,
  FileCheck2,
  LayoutDashboard,
  Lock,
  Menu,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { isAdminRole, isMasterAdminRole } from '@navrix/types';
import { Button, cn } from '@navrix/ui';
import { ECOSYSTEM_ENTITIES } from '../data/ecosystem';
import { useUiStore } from '../store/ui-store';
import styles from './site-header.module.css';

export function SiteHeader({ mode = 'sticky', compactAuth = false }) {
  const pathname = usePathname();
  const { accessToken, user } = useUiStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState(null); // 'ecosystem' | 'governance' | null
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const closeTimerRef = React.useRef(null);

  React.useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    setMobileMenuOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  const handleMenuEnter = (menuKey) => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setOpenMenu(menuKey);
  };

  const handleMenuLeave = () => {
    closeTimerRef.current = window.setTimeout(() => {
      setOpenMenu(null);
    }, 150);
  };

  const workspaceHref = React.useMemo(() => {
    if (!accessToken || !user) return '/dashboard';
    if (isMasterAdminRole(user.role)) return '/admin/master';
    if (isAdminRole(user.role)) return '/admin/dashboard';
    return '/dashboard';
  }, [accessToken, user]);

  const isGovernanceActive = pathname === '/risk-disclosure' || pathname === '/terms-conditions';

  return (
    <>
      <header
        className={cn(
          styles.headerOuter,
          mode === 'static' ? styles.outerStatic : styles.outerFixed,
        )}
      >
        {/* Top Institutional Telemetry Ribbon */}
        {!compactAuth && (
          <div
            className={cn(
              styles.telemetryRibbon,
              isScrolled && mode === 'sticky' && styles.telemetryHidden,
            )}
          >
            <div className={styles.telemetryInner}>
              <div className={styles.telemetryLeft}>
                <span className={styles.liveDot} />
                <span className={styles.telemetryHighlight}>Sovereign Settlement Live</span>
                <span className={styles.telemetryDivider}>·</span>
                <span className={styles.telemetrySub}>
                  BNB Smart Chain (BEP-20) USDT · 12-Block Verification Finality
                </span>
              </div>

              <div className={styles.telemetryRight}>
                <span className={styles.solvencyBadge}>
                  <ShieldCheck size={11} />
                  <span>0.00000000 Ledger Variance</span>
                </span>
                <Link href="/risk-disclosure" className={styles.telemetryLink}>
                  Risk Disclosure
                </Link>
                <Link href="/terms-conditions" className={styles.telemetryLink}>
                  Governance Terms
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation Bar */}
        <div
          className={cn(
            styles.navShellWrap,
            isScrolled && mode === 'sticky' && styles.navShellScrolled,
          )}
        >
          <div className={styles.navBar}>
            {/* Brand Cluster */}
            <Link href="/" className={styles.brandLink}>
              <div className={styles.brandIconTile}>
                <Image
                  src="/brand/logo-mark.png"
                  alt={BRAND_CONFIG.name}
                  width={26}
                  height={26}
                  priority
                />
              </div>
              <div className={styles.brandMeta}>
                <div className={styles.brandTitleRow}>
                  <span className={styles.brandTitle}>{BRAND_CONFIG.name}</span>
                  <span className={styles.brandTierTag}>INSTITUTIONAL</span>
                </div>
                <span className={styles.brandSubtitle}>MULTI-ENGINE FINANCIAL ECOSYSTEM</span>
              </div>
            </Link>

            {/* Desktop Center Navigation */}
            {!compactAuth && (
              <nav className={styles.centerNav} aria-label="Primary Navigation">
                <Link
                  href="/#markets"
                  className={cn(styles.navLinkBtn, pathname === '/' && styles.navLinkActive)}
                >
                  Markets
                </Link>

                {/* Ecosystem / Platform Mega-Menu Trigger */}
                <div
                  className={styles.navItemWrap}
                  onMouseEnter={() => handleMenuEnter('ecosystem')}
                  onMouseLeave={handleMenuLeave}
                >
                  <Link
                    href="/ecosystem"
                    className={cn(
                      styles.navLinkBtn,
                      pathname === '/ecosystem' && styles.navLinkActive,
                    )}
                    onClick={() => setOpenMenu(null)}
                  >
                    <span>Platform</span>
                    <ChevronDown
                      size={13}
                      className={cn(
                        styles.chevronIcon,
                        openMenu === 'ecosystem' && styles.chevronOpen,
                      )}
                    />
                  </Link>

                  {openMenu === 'ecosystem' && (
                    <div
                      className={styles.megaMenu}
                      onMouseEnter={() => handleMenuEnter('ecosystem')}
                      onMouseLeave={handleMenuLeave}
                    >
                      <div>
                        <div className={styles.megaColHeader}>
                          <span>8 Autonomous Financial Engines</span>
                          <span>Ring-Fenced Risk</span>
                        </div>
                        <div className={styles.megaEnginesGrid}>
                          {ECOSYSTEM_ENTITIES.map((entity) => (
                            <Link
                              key={entity.id}
                              href={`/ecosystem?engine=${entity.id}`}
                              className={styles.megaEngineItem}
                              onClick={() => setOpenMenu(null)}
                            >
                              <div className={styles.megaEngineTop}>
                                <span className={styles.megaEngineName}>{entity.name}</span>
                                <span className={styles.megaEngineBadge}>{entity.badge}</span>
                              </div>
                              <span className={styles.megaEngineSub}>{entity.tagline}</span>
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className={styles.megaSidebar}>
                        <div>
                          <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-400 mb-1.5">
                            <Sparkles size={11} />
                            Sovereign Gateway
                          </div>
                          <div className={styles.megaSideTitle}>
                            One Unified Ledger. Eight Decoupled Models.
                          </div>
                          <p className={styles.megaSideDesc}>
                            Compare algorithmic execution, market-neutral hedge systems, pooled USDT
                            vaults, funded accounts, and institutional academies side by side.
                          </p>
                        </div>

                        <div className={styles.megaSideMetrics}>
                          <div className={styles.megaMetricPill}>
                            <div className={styles.megaMetricVal}>25,000+</div>
                            <div className={styles.megaMetricLbl}>Global Allocators</div>
                          </div>
                          <div className={styles.megaMetricPill}>
                            <div className={styles.megaMetricVal}>BEP-20</div>
                            <div className={styles.megaMetricLbl}>USDT Settlement</div>
                          </div>
                        </div>

                        <Link
                          href="/ecosystem"
                          className={styles.megaAllLink}
                          onClick={() => setOpenMenu(null)}
                        >
                          <span>Explore Full Marketplace</span>
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <Link href="/#how-it-works" className={styles.navLinkBtn}>
                  How it works
                </Link>

                <Link href="/#security" className={styles.navLinkBtn}>
                  Security
                </Link>

                <Link
                  href="/about"
                  className={cn(styles.navLinkBtn, pathname === '/about' && styles.navLinkActive)}
                >
                  About
                </Link>

                {/* Resources / Governance Dropdown */}
                <div
                  className={styles.navItemWrap}
                  onMouseEnter={() => handleMenuEnter('governance')}
                  onMouseLeave={handleMenuLeave}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenu((prev) => (prev === 'governance' ? null : 'governance'))
                    }
                    className={cn(styles.navLinkBtn, isGovernanceActive && styles.navLinkActive)}
                  >
                    <span>Resources</span>
                    <ChevronDown
                      size={13}
                      className={cn(
                        styles.chevronIcon,
                        openMenu === 'governance' && styles.chevronOpen,
                      )}
                    />
                  </button>

                  {openMenu === 'governance' && (
                    <div
                      className={styles.compactDropdown}
                      onMouseEnter={() => handleMenuEnter('governance')}
                      onMouseLeave={handleMenuLeave}
                    >
                      <Link
                        href="/about#serpo"
                        className={styles.dropdownItem}
                        onClick={() => setOpenMenu(null)}
                      >
                        <div className={styles.dropdownIconBox}>
                          <Scale size={14} />
                        </div>
                        <div>
                          <div className={styles.dropdownTitle}>S.E.R.P.O. Governance</div>
                          <div className={styles.dropdownSub}>
                            5-pillar entity isolation & operational standard
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/risk-disclosure"
                        className={styles.dropdownItem}
                        onClick={() => setOpenMenu(null)}
                      >
                        <div className={styles.dropdownIconBox}>
                          <ShieldAlert size={14} />
                        </div>
                        <div>
                          <div className={styles.dropdownTitle}>Risk Disclosure</div>
                          <div className={styles.dropdownSub}>
                            Market, smart-contract & autonomous model disclosures
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/terms-conditions"
                        className={styles.dropdownItem}
                        onClick={() => setOpenMenu(null)}
                      >
                        <div className={styles.dropdownIconBox}>
                          <FileCheck2 size={14} />
                        </div>
                        <div>
                          <div className={styles.dropdownTitle}>Terms & Conditions</div>
                          <div className={styles.dropdownSub}>
                            Platform gateway scope & participant eligibility
                          </div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>

                <Link
                  href="/contact"
                  className={cn(styles.navLinkBtn, pathname === '/contact' && styles.navLinkActive)}
                >
                  Contact
                </Link>
              </nav>
            )}

            {/* Right Action Cluster */}
            <div className={styles.rightCluster}>
              {mounted && accessToken ? (
                <Link href={workspaceHref}>
                  <Button size="sm" className={styles.ctaPrimaryBtn}>
                    <LayoutDashboard size={14} className="mr-1.5" />
                    <span>Command Portal</span>
                    <ArrowRight size={13} className="ml-1" />
                  </Button>
                </Link>
              ) : (
                <div className={styles.authGroup}>
                  <Link href="/login" className={styles.loginGhostLink}>
                    <Lock size={12} className="opacity-70" />
                    <span>Sign In</span>
                  </Link>

                  <Link href="/register">
                    <Button size="sm" className={styles.ctaPrimaryBtn}>
                      <span>Open Account</span>
                      <ArrowRight size={13} className="ml-1" />
                    </Button>
                  </Link>
                </div>
              )}

              {!compactAuth && (
                <button
                  type="button"
                  className={styles.mobileMenuToggle}
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  aria-label="Toggle Navigation Menu"
                >
                  {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Institutional Navigation Sheet */}
          {mobileMenuOpen && !compactAuth && (
            <div className={styles.mobileSheet}>
              <div className={styles.mobileStatusBanner}>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  Double-Entry Solvency Verified
                </span>
                <span>BEP-20 USDT</span>
              </div>

              <nav className={styles.mobileNavLinks}>
                {[
                  { href: '/', label: 'Overview' },
                  { href: '/about', label: 'About & S.E.R.P.O. Architecture' },
                  { href: '/ecosystem', label: 'Ecosystem Marketplace (8 Engines)' },
                  { href: '/contact', label: 'Institutional & Partner Desk' },
                  { href: '/risk-disclosure', label: 'Risk Disclosure Statement' },
                  { href: '/terms-conditions', label: 'Terms & Conditions' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      styles.mobileNavLinkItem,
                      pathname === item.href && styles.mobileNavActive,
                    )}
                  >
                    <span>{item.label}</span>
                    <ArrowRight size={14} className="opacity-50" />
                  </Link>
                ))}
              </nav>

              <div className={styles.mobileEnginesBox}>
                <div className={styles.mobileSectionLabel}>Featured Engines</div>
                <div className={styles.mobileEngineChips}>
                  {ECOSYSTEM_ENTITIES.slice(0, 4).map((ent) => (
                    <Link
                      key={ent.id}
                      href={`/ecosystem?engine=${ent.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={styles.mobileEngineChip}
                    >
                      <span>{ent.name}</span>
                      <span>{ent.badge}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.mobileAuthActions}>
                {accessToken ? (
                  <Link
                    href={workspaceHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className="col-span-full"
                  >
                    <Button className="w-full" variant="gold">
                      <LayoutDashboard size={15} className="mr-1.5" />
                      Open Command Portal
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full text-xs font-bold">
                        <Lock size={13} className="mr-1.5" />
                        Client Sign In
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="gold" className="w-full text-xs font-extrabold">
                        Open Account
                        <ArrowRight size={13} className="ml-1" />
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {mode === 'sticky' && <div className={styles.fixedSpacer} />}
    </>
  );
}

export default SiteHeader;
