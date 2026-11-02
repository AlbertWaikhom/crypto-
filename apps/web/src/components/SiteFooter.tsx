'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Globe,
  Layers,
  Shield,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import styles from './site-footer.module.css';

const ECOSYSTEM_ENTITIES = [
  { name: 'Botxp', role: 'Semi-Automated Systems' },
  { name: 'Tradex0.3', role: 'High-Performance Engine' },
  { name: 'ARB24x5', role: 'Automated Hedge Exposure' },
  { name: 'Novex Portfolio', role: 'Hybrid Pooled Capital' },
  { name: 'Funded Master', role: 'Funded Trading Accounts' },
  { name: 'Stockarth Academy', role: 'Market Intelligence' },
];

export function SiteFooter() {
  return (
    <footer className={styles.footerRoot}>
      <div className={styles.footerInner}>
        {/* Top Grid: Brand & Ecosystem Engines */}
        <div className={styles.topGrid}>
          {/* Col 1: Brand & Philosophy */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brandRow}>
              <div className={styles.logoTile}>
                <Image
                  src="/brand/logo-mark.png"
                  alt={BRAND_CONFIG.name}
                  width={32}
                  height={32}
                  priority
                />
              </div>
              <div>
                <div className={styles.brandName}>{BRAND_CONFIG.name}</div>
                <div className={styles.brandMotto}>{BRAND_CONFIG.motto}</div>
              </div>
            </Link>
            <p className={styles.brandSummary}>
              A financial innovation ecosystem connecting participants with
              independent specialized financial companies across systematic
              trading, hedge systems, hybrid capital, and market education.
            </p>
            <div className={styles.socialBadges}>
              <span className={styles.socialBadge} title="Global Ecosystem Network">
                <Globe size={14} /> Global Architecture
              </span>
              <span className={styles.socialBadge} title="BEP-20 Immutable Ledger">
                <Shield size={14} /> Smart Contract Audited
              </span>
            </div>
          </div>

          {/* Col 2: Ecosystem Engines */}
          <div className={styles.navCol}>
            <div className={styles.colHeader}>Ecosystem Engines</div>
            <div className={styles.entityList}>
              {ECOSYSTEM_ENTITIES.map((item) => (
                <Link
                  key={item.name}
                  href="/ecosystem"
                  className={styles.entityItem}
                >
                  <span className={styles.entityName}>{item.name}</span>
                  <span className={styles.entityRole}>{item.role}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3: Quick Links & Transparency */}
          <div className={styles.navCol}>
            <div className={styles.colHeader}>Navigation & Governance</div>
            <ul className={styles.linkList}>
              <li>
                <Link href="/" className={styles.navLink}>
                  Home Overview
                </Link>
              </li>
              <li>
                <Link href="/about" className={styles.navLink}>
                  About & Architecture
                </Link>
              </li>
              <li>
                <Link href="/ecosystem" className={styles.navLink}>
                  Full Ecosystem Directory
                </Link>
              </li>
              <li>
                <Link href="/risk-disclosure" className={styles.navLink}>
                  Risk Disclosure
                </Link>
              </li>
              <li>
                <Link href="/terms-conditions" className={styles.navLink}>
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/login" className={styles.navLinkHighlight}>
                  Unified Portal Login →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Separator */}
        <div className={styles.divider} />

        {/* Regulatory Disclaimer (Zero Contact Information) */}
        <div className={styles.disclaimerBlock}>
          <p className={styles.disclaimerText}>
            <strong>Regulatory Notice & Structural Disclosure:</strong>{' '}
            {BRAND_CONFIG.name} operates strictly as a financial technology ecosystem
            service provider and infrastructure coordinator. {BRAND_CONFIG.name} does
            not directly manage client capital, offer custody of fiat funds, or
            execute broker-dealer operations. Each ecosystem entity operates
            independently under its individual performance model, execution
            infrastructure, and risk management guidelines. Financial market
            participation and digital asset trading carry significant risk of capital
            loss. Participants must evaluate their personal financial standing and
            independent entity documentation prior to capital deployment.
          </p>
        </div>

        {/* Bottom Bar: Copyright & Protocol Status */}
        <div className={styles.bottomBar}>
          <div className={styles.copyText}>
            © {new Date().getFullYear()} {BRAND_CONFIG.name} Platform. All rights
            reserved. Multi-Model Financial Architecture.
          </div>
          <div className={styles.protocolStatus}>
            <span className={styles.statusDot} />
            <span>Infrastructure Online • BNB Smart Chain Settlement</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
