'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Globe, Layers, Scale, Shield, ShieldCheck } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button } from '@navrix/ui';
import styles from './site-footer.module.css';

const CAPITAL_ENGINES = [
  { id: 'botxp', name: 'Botxp', role: 'Semi-Auto Algo' },
  { id: 'tradex03', name: 'Tradex0.3', role: 'High-Alpha' },
  { id: 'arb24x5', name: 'ARB24x5', role: '24/5 Hedge' },
  { id: 'novex-portfolio', name: 'Novex Portfolio', role: 'USDT Vaults' },
  { id: 'funded-master', name: 'Funded Master', role: 'Prop Capital' },
];

const RESEARCH_AND_PORTAL = [
  { href: '/ecosystem?engine=volatility-blaze', label: 'Volatility Blaze', badge: 'Signals' },
  { href: '/ecosystem?engine=stockarth-academy', label: 'Stockarth Academy', badge: 'Equities' },
  { href: '/ecosystem?engine=finup-global', label: 'Finup Global', badge: 'Live FX' },
  { href: '/#markets', label: 'Stock & BND Markets' },
  { href: '/#how-it-works', label: 'How It Works' },
];

export function SiteFooter({ hideTopCta = false }) {
  return (
    <footer className={styles.footerRoot}>
      <div className={styles.footerInner}>
        {/* Pre-Footer Institutional Strip */}
        {!hideTopCta && (
          <div className={styles.topCtaStrip}>
            <div className={styles.topCtaCopy}>
              <div className={styles.topCtaEyebrow}>Sovereign Wealth Infrastructure</div>
              <h3 className={styles.topCtaHeading}>
                Deploy Capital Across Decoupled Quantitative & Hedge Engines
              </h3>
              <p className={styles.topCtaSub}>
                Dedicated USR-xxxx BEP-20 USDT treasury routing, row-locked double-entry MySQL
                accounting, and eight specialized market ecosystems under one roof.
              </p>
            </div>

            <div className={styles.topCtaActions}>
              <Link href="/register">
                <Button variant="gold" size="md" className="w-full">
                  <span>Open Sovereign Account</span>
                  <ArrowRight size={15} />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="secondary" size="md" className="w-full">
                  <Layers size={15} />
                  <span>Institutional Desk</span>
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* 4-Column Institutional Directory */}
        <div className={styles.mainGrid}>
          {/* Column 1: Brand & Sovereign Architecture */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brandRow}>
              <div className={styles.logoTile}>
                <Image
                  src="/brand/logo-mark.png"
                  alt={BRAND_CONFIG.name}
                  width={28}
                  height={28}
                  priority
                />
              </div>
              <div>
                <div className={styles.brandName}>{BRAND_CONFIG.name}</div>
                <div className={styles.brandMotto}>{BRAND_CONFIG.motto}</div>
              </div>
            </Link>

            <p className={styles.brandSummary}>
              {BRAND_CONFIG.name} operates an institutional-grade financial ecosystem gateway,
              uniting independent algorithmic trading desks, delta-balanced hedge models, pooled
              USDT vaults, funded trader programs, and practitioner academies.
            </p>

            <div className={styles.trustPills}>
              <span className={styles.trustPill}>
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>0.00000000 Ledger Variance</span>
              </span>
              <span className={styles.trustPill}>
                <Shield size={13} className="text-amber-400" />
                <span>BEP-20 Non-Custodial Verification</span>
              </span>
              <span className={styles.trustPill}>
                <Globe size={13} className="text-sky-400" />
                <span>60+ Global Jurisdictions</span>
              </span>
            </div>
          </div>

          {/* Column 2: Systematic & Capital Engines */}
          <div className={styles.navCol}>
            <div className={styles.colHeader}>Capital & Algo Engines</div>
            <ul className={styles.linkList}>
              {CAPITAL_ENGINES.map((eng) => (
                <li key={eng.id}>
                  <Link href={`/ecosystem?engine=${eng.id}`} className={styles.footerLink}>
                    <span>{eng.name}</span>
                    <span className={styles.linkRoleBadge}>{eng.role}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/ecosystem" className={styles.footerLinkHighlight}>
                  <span>All 8 Engines</span>
                  <ArrowRight size={13} />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Intelligence, Academy & Tools */}
          <div className={styles.navCol}>
            <div className={styles.colHeader}>Intelligence & Tools</div>
            <ul className={styles.linkList}>
              {RESEARCH_AND_PORTAL.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={styles.footerLink}>
                    <span>{item.label}</span>
                    {item.badge ? <span className={styles.linkRoleBadge}>{item.badge}</span> : null}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/login" className={styles.footerLinkHighlight}>
                  <span>Unified Portal Login</span>
                  <ArrowRight size={13} />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Architecture, Legal & Governance */}
          <div className={styles.navCol}>
            <div className={styles.colHeader}>Governance & Legal</div>
            <ul className={styles.linkList}>
              <li>
                <Link href="/" className={styles.footerLink}>
                  <span>Platform Overview</span>
                </Link>
              </li>
              <li>
                <Link href="/about" className={styles.footerLink}>
                  <span>About & S.E.R.P.O. Model</span>
                </Link>
              </li>
              <li>
                <Link href="/contact" className={styles.footerLink}>
                  <span>Institutional Relations Desk</span>
                </Link>
              </li>
              <li>
                <Link href="/risk-disclosure" className={styles.footerLink}>
                  <span>Risk Disclosure Statement</span>
                </Link>
              </li>
              <li>
                <Link href="/terms-conditions" className={styles.footerLink}>
                  <span>Terms & Conditions</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Mandatory Regulatory & Structural Disclosure */}
        <div className={styles.disclaimerBlock}>
          <div className={styles.disclaimerHeader}>
            <Scale size={13} className="text-amber-400" />
            <span>Regulatory Notice & Structural Risk Disclosure</span>
          </div>
          <p className={styles.disclaimerText}>
            {BRAND_CONFIG.name} Platform operates strictly as a financial technology ecosystem
            gateway and ledger infrastructure coordinator. {BRAND_CONFIG.name} is not a commercial
            bank, regulated securities broker-dealer, or licensed investment advisor, and does not
            directly execute discretionary trades or guarantee investment returns. Each ecosystem
            entity operates autonomously under its independent execution venue, risk parameters, and
            contractual terms. Digital asset transfers, algorithmic trading, and leveraged market
            strategies carry substantial risk of principal loss. Always review individual entity
            disclosures and the Risk Disclosure Statement prior to deploying capital.
          </p>
        </div>

        {/* Bottom Copyright & Live Settlement Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.bottomMeta}>
            <span>
              © {new Date().getFullYear()} {BRAND_CONFIG.name} Platform. All rights reserved.
            </span>
            <span>·</span>
            <span>BNB Smart Chain (Chain ID 56 · BEP-20 USDT)</span>
          </div>

          <div className={styles.protocolStatus}>
            <span className={styles.statusDot} />
            <span>Sovereign Ledger Online · 12-Block Finality</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
