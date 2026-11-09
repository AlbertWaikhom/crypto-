'use client';

import * as React from 'react';
import Link from 'next/link';
import { SiteFooter } from '../SiteFooter';
import { SiteHeader } from '../SiteHeader';
import styles from './legal-doc.module.css';

export function LegalDocLayout({
  activeDoc, // 'risk' | 'terms'
  title,
  subtitle,
  versionLabel = 'Effective November 2026 · Version 4.2',
  executiveSummary,
  clauses = [],
}) {
  return (
    <div className={styles.pageRoot}>
      <SiteHeader mode="sticky" />

      <main className={styles.mainContent}>
        <section className={styles.heroStrip}>
          <div className={styles.container}>
            <div className={styles.switcherRow}>
              <div className={styles.docTabs}>
                <Link
                  href="/risk-disclosure"
                  className={`${styles.docTab} ${activeDoc === 'risk' ? styles.docTabActive : ''}`}
                >
                  Risk Disclosure Statement
                </Link>
                <Link
                  href="/terms-conditions"
                  className={`${styles.docTab} ${activeDoc === 'terms' ? styles.docTabActive : ''}`}
                >
                  Terms & Conditions
                </Link>
                <Link href="/about#serpo" className={styles.docTab}>
                  S.E.R.P.O. Governance
                </Link>
              </div>

              <span className={styles.versionPill}>{versionLabel}</span>
            </div>

            <h1 className={styles.docTitle}>{title}</h1>
            <p className={styles.docSub}>{subtitle}</p>
          </div>
        </section>

        <section className={styles.bodySection}>
          <div className={styles.container}>
            <div className={styles.docGrid}>
              <aside className={styles.tocCard} aria-label="Document Sections">
                <div className={styles.tocHeader}>Clause Index</div>
                <nav className={styles.tocLinks}>
                  {clauses.map((c) => (
                    <a key={c.id} href={`#${c.id}`} className={styles.tocLink}>
                      {c.num} · {c.title}
                    </a>
                  ))}
                </nav>
              </aside>

              <div className={styles.clausesCol}>
                {executiveSummary ? (
                  <div className={styles.summaryAlert}>{executiveSummary}</div>
                ) : null}

                {clauses.map((c) => (
                  <article key={c.id} id={c.id} className={styles.clauseCard}>
                    <div className={styles.clauseNum}>Section {c.num}</div>
                    <h2 className={styles.clauseTitle}>{c.title}</h2>
                    <p className={styles.clauseBody}>{c.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default LegalDocLayout;
