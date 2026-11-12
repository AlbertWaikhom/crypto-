'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  Cpu,
  FileCheck2,
  LayoutDashboard,
  Lock,
  Mail,
  Menu,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Workflow,
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
  const [mobileEcosystemOpen, setMobileEcosystemOpen] = React.useState(false);
  const [mobileGovernanceOpen, setMobileGovernanceOpen] = React.useState(false);
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
    setMobileEcosystemOpen(false);
    setMobileGovernanceOpen(false);
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
                    <LayoutDashboard size={13} className="mr-1" />
                    <span className={styles.ctaFullText}>Command Portal</span>
                    <span className={styles.ctaShortText}>Portal</span>
                    <ArrowRight size={12} className="ml-1" />
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
                      <span className={styles.ctaFullText}>Open Account</span>
                      <span className={styles.ctaShortText}>Open</span>
                      <ArrowRight size={12} className="ml-1" />
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
              {/* Institutional Telemetry Banner */}
              <div className={styles.mobileStatusBanner}>
                <div className={styles.mobileStatusRow}>
                  <div className={styles.mobileStatusLeft}>
                    <span className={styles.liveDot} />
                    <span className={styles.mobileStatusTitle}>Settlement Finality Live</span>
                  </div>
                  <span className={styles.mobileStatusNet}>BEP-20 USDT</span>
                </div>
                <div className={styles.mobileStatusRow}>
                  <span className={styles.mobileSolvencyLabel}>Double-Entry Solvency Verified</span>
                  <div className={styles.mobileSolvencyPill}>
                    <ShieldCheck size={11} />
                    <span>0.00000000 Variance</span>
                  </div>
                </div>
              </div>

              {/* Sub-brand Descriptor */}
              <div className={styles.mobileBrandHeader}>
                <div className={styles.mobileBrandRow}>
                  <span className={styles.mobileBrandName}>{BRAND_CONFIG.name}</span>
                  <span className={styles.mobileBrandBadge}>INSTITUTIONAL GATEWAY</span>
                </div>
                <span className={styles.mobileBrandDesc}>
                  Multi-Engine Financial Ecosystem · Ring-Fenced Autonomous Infrastructure
                </span>
              </div>

              {/* Main Navigation Stack */}
              <nav className={styles.mobileNavLinks} aria-label="Mobile Navigation">
                {/* 1. Overview */}
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    styles.mobileNavLinkItem,
                    pathname === '/' && styles.mobileNavActive,
                  )}
                >
                  <div className={styles.mobileNavLeft}>
                    <Sparkles size={16} className="text-amber-400 opacity-90" />
                    <span>Overview & Ecosystem</span>
                  </div>
                  <ArrowRight size={14} className="opacity-40" />
                </Link>

                {/* 2. Live Markets */}
                <Link
                  href="/#markets"
                  onClick={() => setMobileMenuOpen(false)}
                  className={styles.mobileNavLinkItem}
                >
                  <div className={styles.mobileNavLeft}>
                    <Activity size={16} className="text-emerald-400" />
                    <span>Live Markets & Telemetry</span>
                  </div>
                  <span className={styles.mobileLiveTag}>
                    <span className={styles.liveDotSmall} />
                    LIVE
                  </span>
                </Link>

                {/* 3. Platform (8 Financial Engines) DROPDOWN */}
                <div className={styles.mobileDropdownSection}>
                  <button
                    type="button"
                    onClick={() => setMobileEcosystemOpen((prev) => !prev)}
                    className={cn(
                      styles.mobileDropdownTrigger,
                      mobileEcosystemOpen && styles.mobileDropdownTriggerOpen,
                    )}
                    aria-expanded={mobileEcosystemOpen}
                  >
                    <div className={styles.mobileDropdownLabel}>
                      <Cpu size={16} className="text-amber-400" />
                      <span>Platform Engines</span>
                      <span className={styles.countBadge}>8 Models</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={cn(styles.chevronIcon, mobileEcosystemOpen && styles.chevronOpen)}
                    />
                  </button>

                  {mobileEcosystemOpen && (
                    <div className={styles.mobileDropdownPanel}>
                      <div className={styles.mobilePanelHeader}>
                        <span>Decoupled Execution Architecture</span>
                        <span>Multi-Strategy</span>
                      </div>
                      <div className={styles.mobileEnginesList}>
                        {ECOSYSTEM_ENTITIES.map((entity, index) => (
                          <Link
                            key={entity.id}
                            href={`/ecosystem?engine=${entity.id}`}
                            onClick={() => setMobileMenuOpen(false)}
                            className={styles.mobileEngineCard}
                          >
                            <div className={styles.mobileEngineCardTop}>
                              <span className={styles.mobileEngineIndex}>
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span className={styles.mobileEngineName}>{entity.name}</span>
                              <span className={styles.mobileEngineBadge}>{entity.badge}</span>
                            </div>
                            <span className={styles.mobileEngineDesc}>{entity.tagline}</span>
                          </Link>
                        ))}
                      </div>

                      <Link
                        href="/ecosystem"
                        onClick={() => setMobileMenuOpen(false)}
                        className={styles.mobileExploreMarketBtn}
                      >
                        <span>Explore Full Marketplace (All 8 Engines)</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  )}
                </div>

                {/* 4. How It Works */}
                <Link
                  href="/#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className={styles.mobileNavLinkItem}
                >
                  <div className={styles.mobileNavLeft}>
                    <Workflow size={16} className="text-amber-400 opacity-90" />
                    <span>How It Works · 4-Step Settlement</span>
                  </div>
                  <ArrowRight size={14} className="opacity-40" />
                </Link>

                {/* 5. Security */}
                <Link
                  href="/#security"
                  onClick={() => setMobileMenuOpen(false)}
                  className={styles.mobileNavLinkItem}
                >
                  <div className={styles.mobileNavLeft}>
                    <Shield size={16} className="text-emerald-400 opacity-90" />
                    <span>Security & Multi-Sig Vaults</span>
                  </div>
                  <ArrowRight size={14} className="opacity-40" />
                </Link>

                {/* 6. About */}
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    styles.mobileNavLinkItem,
                    pathname === '/about' && styles.mobileNavActive,
                  )}
                >
                  <div className={styles.mobileNavLeft}>
                    <Scale size={16} className="text-amber-400 opacity-90" />
                    <span>About NAVRIX & Architecture</span>
                  </div>
                  <ArrowRight size={14} className="opacity-40" />
                </Link>

                {/* 7. Resources & Governance DROPDOWN */}
                <div className={styles.mobileDropdownSection}>
                  <button
                    type="button"
                    onClick={() => setMobileGovernanceOpen((prev) => !prev)}
                    className={cn(
                      styles.mobileDropdownTrigger,
                      mobileGovernanceOpen && styles.mobileDropdownTriggerOpen,
                    )}
                    aria-expanded={mobileGovernanceOpen}
                  >
                    <div className={styles.mobileDropdownLabel}>
                      <ShieldCheck size={16} className="text-amber-400" />
                      <span>Resources & Legal Governance</span>
                      <span className={styles.countBadge}>Institutional</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={cn(styles.chevronIcon, mobileGovernanceOpen && styles.chevronOpen)}
                    />
                  </button>

                  {mobileGovernanceOpen && (
                    <div className={styles.mobileDropdownPanel}>
                      <Link
                        href="/about#serpo"
                        onClick={() => setMobileMenuOpen(false)}
                        className={styles.mobileSubLinkItem}
                      >
                        <div className={styles.mobileSubIconBox}>
                          <Scale size={14} />
                        </div>
                        <div className={styles.mobileSubMeta}>
                          <div className={styles.mobileSubTitle}>S.E.R.P.O. Governance</div>
                          <div className={styles.mobileSubDesc}>
                            5-pillar entity isolation & operational standards
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/risk-disclosure"
                        onClick={() => setMobileMenuOpen(false)}
                        className={styles.mobileSubLinkItem}
                      >
                        <div className={styles.mobileSubIconBox}>
                          <ShieldAlert size={14} />
                        </div>
                        <div className={styles.mobileSubMeta}>
                          <div className={styles.mobileSubTitle}>Risk Disclosure</div>
                          <div className={styles.mobileSubDesc}>
                            Market volatility, contract & algorithmic disclosures
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/terms-conditions"
                        onClick={() => setMobileMenuOpen(false)}
                        className={styles.mobileSubLinkItem}
                      >
                        <div className={styles.mobileSubIconBox}>
                          <FileCheck2 size={14} />
                        </div>
                        <div className={styles.mobileSubMeta}>
                          <div className={styles.mobileSubTitle}>Terms & Conditions</div>
                          <div className={styles.mobileSubDesc}>
                            Platform gateway terms & eligibility criteria
                          </div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>

                {/* 8. Contact Desk */}
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    styles.mobileNavLinkItem,
                    pathname === '/contact' && styles.mobileNavActive,
                  )}
                >
                  <div className={styles.mobileNavLeft}>
                    <Mail size={16} className="text-amber-400 opacity-90" />
                    <span>Institutional & Partner Desk</span>
                  </div>
                  <ArrowRight size={14} className="opacity-40" />
                </Link>
              </nav>

              {/* Mobile Auth & Command Actions */}
              <div className={styles.mobileAuthActions}>
                {accessToken ? (
                  <div className={styles.mobileUserWrap}>
                    {user?.email && (
                      <div className={styles.mobileUserPill}>
                        <span className={styles.userDot} />
                        <span className={styles.userEmail}>{user.email}</span>
                        <span className={styles.userRoleTag}>
                          {user.role === 'MASTER_ADMIN'
                            ? 'MASTER'
                            : user.role === 'ADMIN'
                              ? 'ADMIN'
                              : 'INVESTOR'}
                        </span>
                      </div>
                    )}
                    <Link
                      href={workspaceHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full"
                    >
                      <Button className="w-full" variant="gold">
                        <LayoutDashboard size={15} className="mr-1.5" />
                        Open Command Portal
                        <ArrowRight size={14} className="ml-1" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className={styles.mobileGuestActions}>
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
                  </div>
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
