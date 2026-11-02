'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Briefcase,
  Cpu,
  ExternalLink,
  GraduationCap,
  Layers,
  PieChart,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button, GradientText, ShinyText, SpotlightCard } from '@navrix/ui';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import {
  ECOSYSTEM_CATEGORIES,
  ECOSYSTEM_ENTITIES,
  EcosystemEntity,
} from '../../data/ecosystem';
import styles from './ecosystem.module.css';

export default function EcosystemPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>(
    'All Entities',
  );

  const filteredEntities = React.useMemo(() => {
    if (selectedCategory === 'All Entities') return ECOSYSTEM_ENTITIES;
    return ECOSYSTEM_ENTITIES.filter((e) => e.category === selectedCategory);
  }, [selectedCategory]);

  const categoriesToRender = React.useMemo(() => {
    if (selectedCategory !== 'All Entities') {
      return [selectedCategory];
    }
    const cats = Array.from(new Set(ECOSYSTEM_ENTITIES.map((e) => e.category)));
    return cats;
  }, [selectedCategory]);

  return (
    <div className={styles.pageRoot}>
      <SiteHeader mode="sticky" />

      <motion.main
        className={styles.mainContent}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* HERO HEADER */}
        <motion.div
          className={styles.heroHeader}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className={styles.badgePill}>
            <Sparkles className="h-3 w-3 text-amber-400" />
            <ShinyText text="INTEGRATED FINANCIAL ECOSYSTEM" />
          </span>

          <h1 className={styles.pageTitle}>
            {BRAND_CONFIG.name} Platform Ecosystem —{' '}
            <GradientText variant="sovereign">
              An Integrated Financial Ecosystem
            </GradientText>
          </h1>

          <p className={styles.pageSubtitle}>
            {BRAND_CONFIG.name} Platform connects specialized financial
            companies operating across automation, hedge systems, hybrid
            investment models, funded programs, and professional education —
            each functioning independently under its own framework.
          </p>
        </motion.div>

        <div className={styles.filterTabsRow}>
          {ECOSYSTEM_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`${styles.tabBtn} ${selectedCategory === cat ? styles.tabBtnActive : ''
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* CATEGORIES & DETAILED ENTITY CARDS */}
        {categoriesToRender.map((catName) => {
          const entitiesInCat = filteredEntities.filter(
            (e) => e.category === catName,
          );
          if (entitiesInCat.length === 0) return null;

          return (
            <section key={catName} className={styles.categoryGroup}>
              <div className={styles.categoryHeader}>
                <div className={styles.categoryTitle}>
                  <Layers className="h-5 w-5 text-amber-400" />
                  <span>{catName}</span>
                </div>
                <span className={styles.categoryTag}>
                  {entitiesInCat.length} {entitiesInCat.length === 1 ? 'Entity' : 'Entities'}
                </span>
              </div>

              <div className={styles.cardsGrid}>
                {entitiesInCat.map((entity) => (
                  <SpotlightCard
                    key={entity.id}
                    tone="gold"
                    className={styles.entityDetailCard}
                  >
                    <div>
                      <div className={styles.cardTop}>
                        <div>
                          <h3 className={styles.entityName}>{entity.name}</h3>
                          <div className={styles.entityTagline}>
                            {entity.tagline}
                          </div>
                        </div>
                        <span className={styles.badgePillSmall}>
                          {entity.badge}
                        </span>
                      </div>

                      <p className={styles.entityDescription}>
                        {entity.fullDescription}
                      </p>

                      {/* Who It's For */}
                      <div className={styles.specBox}>
                        <div className={styles.specLabel}>Who It&apos;s For</div>
                        <div className={styles.chipList}>
                          {entity.whoItsFor.map((w, idx) => (
                            <span key={idx} className={styles.specChip}>
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={styles.specBox}>
                        <div className={styles.specLabel}>Performance Model</div>
                        <p className={styles.specValue}>
                          {entity.performanceModel}
                        </p>
                      </div>

                      {/* Risk Structure */}
                      <div className={styles.specBox}>
                        <div className={styles.specLabel}>Risk Structure</div>
                        <div className="flex flex-col gap-1">
                          {entity.riskStructure.map((r, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 text-xs text-slate-300"
                            >
                              <span className="h-1 w-1 rounded-full bg-amber-400" />
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <span className="text-xs text-slate-500">
                        Independent Framework
                      </span>
                      <a
                        href={entity.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.visitBtn}
                      >
                        Visit Official Website
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </section>
          );
        })}

        {/* JOIN THE ECOSYSTEM CTA */}
        <section className={styles.ctaBox}>
          <span className={styles.badgePill}>JOIN THE ECOSYSTEM</span>
          <h2 className="text-2xl md:text-3xl font-extrabold max-w-xl mx-auto">
            Access Specialized Financial Engines Through One Structured Gateway
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mt-2 mb-6">
            Explore independent companies across automation, hedge systems,
            funded programs, hybrid investment structures, and professional
            education.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/login">
              <Button variant="gold" size="lg">
                Explore Portal
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary" size="lg">
                Partner With {BRAND_CONFIG.name}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </motion.main>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  );
}
