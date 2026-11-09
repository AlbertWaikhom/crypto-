'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ExternalLink, Search, Sparkles } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button, GradientText, ShinyText, SpotlightCard } from '@navrix/ui';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader';
import { EngineShowcaseCarousel } from '../../components/marketing/EngineShowcaseCarousel';
import { ECOSYSTEM_CATEGORIES, ECOSYSTEM_ENTITIES } from '../../data/ecosystem';
import styles from './ecosystem.module.css';

function renderMiniSparkline(points = [], color = '#F5B82E') {
  if (!points.length) return null;
  const min = Math.min(...points) - 4;
  const max = Math.max(...points) + 4;
  const span = Math.max(1, max - min);
  const d = points
    .map((v, i) => {
      const x = (i / Math.max(1, points.length - 1)) * 108;
      const y = 36 - ((v - min) / span) * 28 - 4;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 108 38" className="w-full h-full overflow-visible" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function EcosystemPage() {
  const location = useLocation();
  const queryEngineId = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('engine');
  }, [location.search]);

  const [selectedCategory, setSelectedCategory] = React.useState('All Entities');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredEntities = React.useMemo(() => {
    return ECOSYSTEM_ENTITIES.filter((e) => {
      const matchCat = selectedCategory === 'All Entities' || e.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.tagline.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.badge.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className={styles.pageRoot}>
      <SiteHeader mode="sticky" />

      <main className={styles.mainContent}>
        {/* 1. HERO + INTERACTIVE ENGINE CAROUSEL */}
        <section className={styles.heroBlock}>
          <div className={styles.container}>
            <motion.div
              className={styles.heroCenter}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <span className={styles.eyebrowPill}>
                <Sparkles size={13} />
                <ShinyText text="ECOSYSTEM ENGINE MARKETPLACE" />
              </span>

              <h1 className={styles.pageTitle}>
                Eight Autonomous Financial Engines.{' '}
                <GradientText variant="sovereign">One Sovereign Gateway.</GradientText>
              </h1>

              <p className={styles.pageSubtitle}>
                Compare systematic algorithmic desks, 24/5 hedge architectures, duration-matched
                USDT vaults, proprietary funded evaluations, and live market academies—each
                operating under independent S.E.R.P.O. risk isolation.
              </p>
            </motion.div>

            <EngineShowcaseCarousel initialEngineId={queryEngineId} />
          </div>
        </section>

        {/* 2. FILTERABLE DIRECTORY OF ALL 8 ENTITIES */}
        <section className={styles.sectionBlockAlt}>
          <div className={styles.container}>
            <div className={styles.toolbar}>
              <div className={`${styles.filterTabs} nv-no-scrollbar`} role="tablist">
                {ECOSYSTEM_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={selectedCategory === cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`${styles.filterBtn} ${selectedCategory === cat ? styles.filterBtnActive : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className={styles.searchWrap}>
                <Search size={15} className={styles.searchIcon} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter engine, hedge, MT5..."
                  className={styles.searchInput}
                  aria-label="Filter ecosystem engines"
                />
              </div>
            </div>

            <div className={styles.cardsGrid}>
              {filteredEntities.map((entity) => (
                <SpotlightCard key={entity.id} tone="gold" className={styles.engineCard}>
                  <div className="flex flex-col gap-3">
                    <div className={styles.cardHeader}>
                      <div>
                        <span className="text-[11px] font-extrabold tracking-wider text-amber-400">
                          {entity.code} · {entity.badge}
                        </span>
                        <h2 className={styles.engineName}>{entity.name}</h2>
                        <div
                          className="text-xs font-bold mt-0.5"
                          style={{ color: entity.accentColor }}
                        >
                          {entity.tagline}
                        </div>
                      </div>

                      <div className={styles.miniSparkBox}>
                        {renderMiniSparkline(entity.sparkline, entity.accentColor)}
                      </div>
                    </div>

                    <p
                      className="text-sm leading-relaxed m-0"
                      style={{ color: 'var(--nv-text-muted)' }}
                    >
                      {entity.fullDescription}
                    </p>

                    <div className={styles.metaRow}>
                      <div className={styles.metaCell}>
                        <div className={styles.metaLbl}>Cadence</div>
                        <div className={styles.metaVal}>{entity.cadence}</div>
                      </div>
                      <div className={styles.metaCell}>
                        <div className={styles.metaLbl}>Risk Profile</div>
                        <div className={styles.metaVal}>{entity.riskTier}</div>
                      </div>
                      <div className={styles.metaCell}>
                        <div className={styles.metaLbl}>Access</div>
                        <div className={styles.metaVal}>{entity.accessModel}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-1">
                      {entity.riskStructure.map((r) => (
                        <div key={r} className="flex items-center gap-2 text-xs font-semibold">
                          <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>

                    <div className={styles.chipRow}>
                      {entity.whoItsFor.map((w) => (
                        <span key={w} className={styles.chip}>
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: 'var(--nv-text-muted)' }}
                    >
                      {entity.category}
                    </span>
                    <a
                      href={entity.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-400 hover:underline"
                    >
                      <span>Visit Official Portal</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>

        {/* 3. SIDE-BY-SIDE INSTITUTIONAL COMPARISON MATRIX */}
        <section className={styles.sectionBlock}>
          <div className={styles.container}>
            <div className="max-w-2xl mb-6">
              <span className={styles.eyebrowPill}>COMPARISON MATRIX</span>
              <h2 className="text-2xl md:text-3xl font-extrabold mt-3 mb-1">
                Side-by-Side Engine Specification Matrix
              </h2>
              <p className="text-sm m-0" style={{ color: 'var(--nv-text-muted)' }}>
                Evaluate execution cadence, risk classification, and onboarding pathway across all
                eight independent companies.
              </p>
            </div>

            <div className={styles.tableScroller}>
              <table className={styles.matrixTable}>
                <thead>
                  <tr>
                    <th>Engine</th>
                    <th>Vertical</th>
                    <th>Settlement Cadence</th>
                    <th>Risk Classification</th>
                    <th>Onboarding Pathway</th>
                    <th>Portal</th>
                  </tr>
                </thead>
                <tbody>
                  {ECOSYSTEM_ENTITIES.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <strong className="font-extrabold">{e.name}</strong>
                        <div className="text-xs" style={{ color: 'var(--nv-text-muted)' }}>
                          {e.code}
                        </div>
                      </td>
                      <td>{e.badge}</td>
                      <td>{e.cadence}</td>
                      <td>{e.riskTier}</td>
                      <td>{e.accessModel}</td>
                      <td>
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-amber-400 hover:underline"
                        >
                          <span>Open</span>
                          <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl border border-amber-400/30 bg-amber-400/5">
              <div>
                <div className="text-base font-extrabold">
                  Ready to fund your dedicated BEP-20 USDT Sovereign Account?
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--nv-text-muted)' }}>
                  Create your unified investor profile in under two minutes or contact our
                  Institutional Desk for bespoke liquidity routing.
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Link href="/register">
                  <Button variant="gold" size="md">
                    <span>Open Sovereign Account</span>
                    <ArrowRight size={14} />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="secondary" size="md">
                    <span>Institutional Desk</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
