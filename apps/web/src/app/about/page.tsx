'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Layers,
  Network,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button, CountUp, GradientText, ShinyText, SpotlightCard } from '@navrix/ui';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { ECOSYSTEM_ENTITIES } from '../../data/ecosystem';
import styles from './about.module.css';

const SERPO_ITEMS = [
  {
    letter: 'S',
    title: 'Strategy Framework',
    desc: 'Independent system logic, algorithmic parameters, and quantitative model architecture specific to each entity.',
  },
  {
    letter: 'E',
    title: 'Execution Model',
    desc: 'Autonomous execution pathways, brokerage conduits, and platform-level operating decisions.',
  },
  {
    letter: 'R',
    title: 'Risk Structure',
    desc: 'Entity-specific controls, maximum drawdown limits, and sovereign exposure management design.',
  },
  {
    letter: 'P',
    title: 'Performance Reporting',
    desc: 'Dedicated reporting frameworks directly aligned with each operating company model.',
  },
  {
    letter: 'O',
    title: 'Operational Policies',
    desc: 'Independent governance, legal terms, and operational policy architecture for each company.',
  },
];

const MISSIONS = [
  'To make structured financial systems accessible globally',
  'To bridge automation, hedge exposure, hybrid investments, and education',
  'To provide a unified access point to specialized financial entities',
  'To promote responsible participation through transparency and risk awareness',
];

const WHAT_WE_ENABLE = [
  'Provide structured visibility across disparate financial models',
  'Maintain brand-level consistency and unified user experience',
  'Facilitate access to independent specialized financial companies',
  'Support infrastructure alignment and execution stability',
  'Promote responsible risk understanding and clear disclosure',
];

const WHAT_WE_DO_NOT = [
  'Manage investor funds directly',
  'Execute trades on behalf of clients',
  'Guarantee performance or fixed returns',
  'Offer regulated financial or investment advisory services',
];

const PHILOSOPHY_POINTS = [
  { num: '01', text: 'Financial markets are dynamic and require multifaceted approaches.' },
  { num: '02', text: 'Single-strategy dependence creates vulnerability during macroeconomic regime shifts.' },
  { num: '03', text: 'Ecosystem-based financial architecture creates structural resilience and longevity.' },
  { num: '04', text: `${BRAND_CONFIG.name} Platform exists to structure that architecture with integrity.` },
];

export default function AboutPage() {
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
            <ShinyText text="INSTITUTIONAL ARCHITECTURE" />
          </span>

          <h1 className={styles.pageTitle}>
            About {BRAND_CONFIG.name} Platform —{' '}
            <GradientText variant="sovereign">
              Building Financial Infrastructure for the Modern Era
            </GradientText>
          </h1>

          <p className={styles.pageSubtitle}>
            {BRAND_CONFIG.name} Platform operates as a financial innovation
            ecosystem connecting specialized companies across trading systems,
            investment structures, funded programs, and professional education.
          </p>
        </motion.div>

        {/* WHO WE ARE */}
        <section className={styles.serpoSection}>
          <h2 className={styles.sectionHeading}>Who We Are</h2>
          <p className={styles.sectionLead}>
            We are a centralized ecosystem platform designed to connect traders,
            investors, and capital participants with independent financial companies
            operating under structured models. {BRAND_CONFIG.name} provides
            ecosystem connectivity, infrastructure visibility, and unified access.
          </p>

          <div className={styles.serpoGrid}>
            {SERPO_ITEMS.map((item, idx) => (
              <div key={idx} className={styles.serpoCard}>
                <div className={styles.serpoLetter}>{item.letter}</div>
                <div className={styles.serpoTitle}>{item.title}</div>
                <p className={styles.serpoDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* VISION & MISSION SPLIT */}
        <section className={styles.splitSection}>
          <div className={styles.visionCard}>
            <div>
              <span className={styles.badgePill}>OUR VISION</span>
              <h2 className={styles.sectionHeading}>
                System Architecture for the Next Era of Finance
              </h2>
              <p className="text-sm leading-relaxed text-slate-300 mt-2">
                To create a diversified financial ecosystem where multiple
                earning models can operate under one structured architecture —
                while maintaining operational independence and transparency.
              </p>
            </div>

            <div className={styles.visionQuote}>
              “We believe the future of finance is not a single strategy. It is
              an ecosystem of systems.”
            </div>
          </div>

          <div>
            <span className={styles.badgePill}>OUR MISSION</span>
            <h2 className={styles.sectionHeading}>How We Build It</h2>
            <div className={styles.missionList}>
              {MISSIONS.map((m, idx) => (
                <div key={idx} className={styles.missionItem}>
                  <div className={styles.missionNum}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className={styles.missionText}>{m}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* THE ECOSYSTEM DIRECTORY */}
        <section className="my-14">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className={styles.badgePill}>ENTITIES DIRECTORY</span>
            <h2 className={styles.sectionHeading}>The {BRAND_CONFIG.name} Ecosystem</h2>
            <p className="text-sm text-slate-400 mt-1">
              {BRAND_CONFIG.name} Platform connects users to the following
              independent ecosystem companies:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ECOSYSTEM_ENTITIES.map((entity) => (
              <SpotlightCard
                key={entity.id}
                tone="gold"
                className="p-5 flex flex-col justify-between rounded-xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-extrabold text-base">{entity.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/25">
                      {entity.badge}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-amber-400 mb-2">
                    {entity.tagline}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-3">
                    {entity.shortDescription}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Autonomous Model</span>
                  <a
                    href={entity.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-amber-400 hover:underline flex items-center gap-1"
                  >
                    Website <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </SpotlightCard>
            ))}
          </div>

          <p className="text-xs text-center text-slate-400 mt-5">
            Each entity operates independently with its own performance model and
            operational framework.
          </p>
        </section>

        {/* HOW WE OPERATE */}
        <section className={styles.operateSection}>
          <div className="text-center max-w-xl mx-auto mb-6">
            <span className={styles.badgePill}>GATEWAY SPECIFICATION</span>
            <h2 className={styles.sectionHeading}>How We Operate</h2>
            <p className="text-sm text-slate-400">
              {BRAND_CONFIG.name} Platform serves as an ecosystem gateway.
            </p>
          </div>

          <div className={styles.operateGrid}>
            <div className={styles.operateCard}>
              <div className={styles.operateCardTitle}>
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>What We Enable</span>
              </div>
              <div className={styles.operateList}>
                {WHAT_WE_ENABLE.map((item, idx) => (
                  <div key={idx} className={styles.operateItem}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.operateCard}>
              <div className={styles.operateCardTitle}>
                <XCircle className="h-5 w-5 text-rose-400" />
                <span>What We Do Not Directly Do</span>
              </div>
              <div className={styles.operateList}>
                {WHAT_WE_DO_NOT.map((item, idx) => (
                  <div key={idx} className={styles.operateItem}>
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ECOSYSTEM REACH & GROWTH */}
        <section className="my-14 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-emerald-500/10 p-8 border border-amber-400/25 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">
            Ecosystem Reach
          </div>
          <div className="text-4xl md:text-5xl font-black text-white">
            <CountUp value={25000} decimals={0} />+
          </div>
          <div className="text-sm font-bold text-slate-200 mt-1">Users Globally</div>
          <p className="max-w-xl mx-auto text-xs text-slate-400 mt-3 leading-relaxed">
            The {BRAND_CONFIG.name} ecosystem has grown to serve over 25,000+
            users globally across trading systems, capital programs, and
            education platforms. Growth has been driven by diversification,
            specialization, and system-based financial models.
          </p>
        </section>

        {/* OUR PHILOSOPHY */}
        <section className={styles.philosophySection}>
          <div className="text-center max-w-lg mx-auto">
            <span className={styles.badgePill}>FOUNDATIONAL PILLARS</span>
            <h2 className={styles.sectionHeading}>Our Philosophy</h2>
          </div>

          <div className={styles.philosophyGrid}>
            {PHILOSOPHY_POINTS.map((p, idx) => (
              <div key={idx} className={styles.philosophyCard}>
                <div className={styles.philosophyNum}>{p.num}</div>
                <div className={styles.philosophyText}>{p.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* BUILD WITH NAVRIX CTA */}
        <div className="my-10 rounded-2xl p-8 border border-amber-400/30 bg-slate-900/90 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold">
            Explore the Ecosystem. Partner With Structured Financial
            Infrastructure.
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mt-2 mb-6">
            Access independent financial entities through one unified platform
            built for visibility, specialization, and responsible participation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/ecosystem">
              <Button variant="gold" size="lg">
                <Layers className="h-4 w-4" />
                Explore Our Ecosystem
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Partner With {BRAND_CONFIG.name}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.main>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  );
}
