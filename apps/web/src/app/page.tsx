'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Cpu,
  ExternalLink,
  Globe,
  GraduationCap,
  Layers,
  LineChart,
  Lock,
  Network,
  PieChart,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { isAdminRole, isMasterAdminRole } from '@navrix/types';
import {
  AuroraBackground,
  Button,
  CountUp,
  DecryptedText,
  GradientText,
  ShinyText,
  SpotlightCard,
  StarBorder,
  TiltedCard,
} from '@navrix/ui';
import { DashboardTutorialMockup } from '../components/DashboardTutorialMockup';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { ECOSYSTEM_ENTITIES } from '../data/ecosystem';
import { useUiStore } from '../store/ui-store';
import styles from './landing.module.css';

const ParticleText: React.ComponentType<any> = dynamic(
  () => import('../components/ParticleText'),
  { ssr: false }
);
const CardSwap: React.ComponentType<any> = dynamic(
  () => import('../components/CardSwap'),
  { ssr: false }
);

const ADMIN_BASE_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';

const PARTICIPANT_BENEFITS = [
  {
    title: 'Multi-Model Financial Architecture',
    desc: 'Unifying algorithmic, hedge, hybrid, and funded programs under one structured access gateway.',
  },
  {
    title: 'Automated & Semi-Automated Systems',
    desc: 'Disciplined algorithmic models with systematic exposure and monitored execution oversight.',
  },
  {
    title: 'Hedge & Hybrid Investment Structures',
    desc: 'Market-neutral arbitrage and pooled capital frameworks designed for capital resilience.',
  },
  {
    title: 'Funded Capital Programs',
    desc: 'Evaluation-based account allocations empowering qualified traders with structured liquidity.',
  },
  {
    title: 'Professional Trading Education',
    desc: 'Live interactive curricula spanning Indian equity markets and institutional Forex methodologies.',
  },
  {
    title: '25,000+ Global Participants',
    desc: 'Active international community spanning automated allocators, proprietary traders, and learners.',
  },
];

const TRANSPARENCY_PILLARS = [
  {
    title: 'Structured',
    desc: 'NAVRIX Platform does not directly manage capital or execute trades. Our role is strictly to provide structured access, unified infrastructure, and seamless ecosystem visibility.',
    icon: Network,
    tone: 'gold' as const,
  },
  {
    title: 'Separated',
    desc: 'Each ecosystem company operates independently under its own strategy, execution model, and risk framework without cross-entity commingling of liabilities or exposure.',
    icon: ShieldCheck,
    tone: 'emerald' as const,
  },
  {
    title: 'Transparent',
    desc: 'Users are encouraged to review individual company disclosures, understand risk exposure, and conduct independent evaluation before participating in any ecosystem engine.',
    icon: Scale,
    tone: 'cyan' as const,
  },
];

const INFRASTRUCTURE_PILLARS = [
  {
    title: 'Brokerage Platforms',
    desc: 'Institutional-grade execution environments connected with industry-standard MT5 bridges and execution venues.',
    icon: Building2Icon,
  },
  {
    title: 'Liquidity Access',
    desc: 'System stability focused deployment architecture ensuring robust access across high-volatility sessions.',
    icon: LineChart,
  },
  {
    title: 'Execution Stability',
    desc: 'Operational efficiency across ecosystem entities with continuous uptime and latency monitoring.',
    icon: Cpu,
  },
];

function Building2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 11h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z"
      />
    </svg>
  );
}

export default function LandingPage() {
  const { accessToken, user } = useUiStore();

  const primaryHref = !accessToken || !user
    ? '/register'
    : isMasterAdminRole(user.role)
      ? `${ADMIN_BASE_URL}/master`
      : isAdminRole(user.role)
        ? `${ADMIN_BASE_URL}/dashboard`
        : '/dashboard';

  return (
    <div className={styles.pageRoot}>
      {/* Pinned Sticky and Static Header with instant Mode Toggle */}
      <SiteHeader mode="sticky" />

      <main className={styles.mainContent}>
        {/* HERO SECTION WITH ENTRANCE OPENING ANIMATION */}
        <motion.section
          className={styles.heroSection}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.heroGrid}>
            <div className={styles.heroCopyCol}>
              <motion.div
                className={styles.eyebrowRow}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <span className={styles.networkBadge}>
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <ShinyText text="FINANCIAL INNOVATION ECOSYSTEM" />
                </span>
                <span className={styles.securityChip}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  25,000+ Global Participants
                </span>
              </motion.div>

              <div className={styles.particleHeroBox}>
                <ParticleText
                  text="NAVRIX PLATFORM"
                  particleSize={2.2}
                  density={4}
                  color="#f5b82e"
                  highlightColor="#38bdf8"
                  highlightMode="motion"
                  shape="circle"
                  intro="gather"
                  scatter={180}
                  gatherDuration={1500}
                  stagger={380}
                  clickBurst
                  burstStrength={1}
                  pointerRepel={38}
                  repelRadius={110}
                  idleDrift={0.7}
                  trigger="mount"
                  fontSize="clamp(2rem, 5vw, 3.4rem)"
                  fontWeight={800}
                  fontFamily="inherit"
                  glow
                />
              </div>

              <motion.h1
                className={styles.heroHeadline}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                One Ecosystem.{' '}
                <GradientText variant="sovereign">
                  Multiple Financial Engines.
                </GradientText>
              </motion.h1>

              <motion.p
                className={styles.heroDescription}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                {BRAND_CONFIG.name} Platform is a financial innovation
                ecosystem connecting traders, investors, and capital participants
                with specialized financial companies across automation, hedge
                systems, hybrid funds, funded programs, and professional
                education.
              </motion.p>

              <motion.div
                className={styles.ctaRow}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.4 }}
              >
                <Link href="/ecosystem">
                  <Button variant="gold" size="lg">
                    <Layers className="h-4 w-4" />
                    Explore Our Ecosystem
                  </Button>
                </Link>

                <Link href={primaryHref}>
                  <Button variant="secondary" size="lg">
                    Partner With {BRAND_CONFIG.name}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                className={styles.heroMetaRibbon}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <div className={styles.metaItem}>
                  <span className={styles.metaDot} />
                  <span>Multi-model financial architecture</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaDot} />
                  <span>25,000+ ecosystem users globally</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaDot} />
                  <span>8+ independent specialized entities</span>
                </div>
              </motion.div>
            </div>

            {/* HERO RIGHT: Interactive 3D CardSwap Deck */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.75, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.cardSwapContainer}>
                <div className={styles.cardSwapHeader}>
                  <span className={styles.cardSwapTitle}>Ecosystem Engines</span>
                  <span className={styles.cardSwapBadge}>
                    <Sparkles className="h-3 w-3" />
                    Interactive 3D Deck
                  </span>
                </div>
                <div className={styles.cardSwapStageWrapper}>
                  <CardSwap
                    width={320}
                    height={320}
                    cardDistance={32}
                    verticalDistance={22}
                    depth={160}
                    skewAmount={3}
                    autoplay
                    delay={3500}
                    pauseOnHover
                    theme="dark"
                  />
                </div>
                <div className={styles.cardSwapHint}>
                  Drag, swipe or hover to inspect specialized financial entities
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* FLAGSHIP FEATURE: INTERACTIVE DASHBOARD MOCKUP & GUIDED TUTORIAL */}
        <motion.section
          className={styles.mockupSection}
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPill}>
              <Sparkles className="h-3 w-3 text-amber-400" />
              INTERACTIVE INVESTOR EXPERIENCE
            </span>
            <h2 className={styles.sectionTitle}>
              Live Dashboard Mockup & Guided Walkthrough
            </h2>
            <p className={styles.sectionSubtitle}>
              Experience how {BRAND_CONFIG.name} operates from an investor&apos;s
              perspective. Follow the 4 interactive tour steps below to explore
              our dedicated USDT vault, multi-engine strategy allocations,
              append-only ledger proofs, and frictionless outbound withdrawals.
            </p>
          </div>

          <DashboardTutorialMockup />
        </motion.section>

        {/* SECTION 1: ENGINEERING FINANCIAL ECOSYSTEMS */}
        <motion.section
          className={styles.engineeringSection}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65 }}
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPill}>
              <DecryptedText text="ECOSYSTEM ARCHITECTURE" speedMs={40} />
            </span>
            <h2 className={styles.sectionTitle}>
              Engineering Financial Ecosystems
            </h2>
            <p className={styles.sectionSubtitle}>
              {BRAND_CONFIG.name} Platform operates as a structured financial
              ecosystem designed to unify specialized companies under one
              centralized platform. Rather than functioning as a single trading
              entity, {BRAND_CONFIG.name} connects independent financial
              companies — each operating with its own strategy model, execution
              framework, and risk structure. Our role is to provide access,
              infrastructure, and ecosystem connectivity.
            </p>
          </div>

          <div className={styles.statCardsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>One</div>
              <div className={styles.statLabel}>Unified Ecosystem</div>
              <div className={styles.statDescription}>
                Single sovereign gateway uniting diverse capital, algorithmic, and
                educational engines.
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statValue}>8+</div>
              <div className={styles.statLabel}>Independent Entities</div>
              <div className={styles.statDescription}>
                Autonomous financial entities with decoupled strategies, models, and
                governance.
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statValue}>
                <CountUp value={25000} decimals={0} />+
              </div>
              <div className={styles.statLabel}>Global Users</div>
              <div className={styles.statDescription}>
                Active market allocators, algorithmic traders, and learners across
                60+ jurisdictions.
              </div>
            </div>
          </div>
        </motion.section>

        {/* SECTION 2: DIVERSIFIED FINANCIAL INFRASTRUCTURE */}
        <motion.section
          className={styles.infrastructureSection}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65 }}
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPill}>
              SPECIALIZED ENTITIES
            </span>
            <h2 className={styles.sectionTitle}>
              A Diversified Financial Infrastructure
            </h2>
            <p className={styles.sectionSubtitle}>
              {BRAND_CONFIG.name} Platform connects users to multiple specialized
              financial companies. Each entity operates independently with its own
              performance model and operational framework.
            </p>
          </div>

          <div className={styles.entitiesGrid}>
            {ECOSYSTEM_ENTITIES.map((entity) => (
              <SpotlightCard
                key={entity.id}
                tone="gold"
                className={styles.entityCard}
              >
                <div className={styles.entityCardTop}>
                  <div className={styles.entityHeaderRow}>
                    <span className={styles.entityTitle}>{entity.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/25">
                      {entity.badge}
                    </span>
                  </div>
                  <div className={styles.entityTagline}>{entity.tagline}</div>
                  <p className={styles.entityDesc}>{entity.shortDescription}</p>
                </div>

                <div className={styles.entityCardBottom}>
                  <span className="text-[11px] text-slate-500">
                    Independent Entity
                  </span>
                  <a
                    href={entity.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.entityLink}
                  >
                    Visit Entity
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </SpotlightCard>
            ))}
          </div>

          <div className={styles.centerCtaWrap}>
            <Link href="/ecosystem">
              <Button variant="gold" size="md">
                View Full Ecosystem Architecture →
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* SECTION 3: BUILT FOR MODERN MARKET PARTICIPANTS */}
        <motion.section
          className={styles.participantsSection}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65 }}
        >
          <div className={styles.participantsCard}>
            <div className="text-center max-w-2xl mx-auto mb-6">
              <span className={styles.sectionPill}>PARTICIPANT SCOPE</span>
              <h2 className={styles.sectionTitle}>
                Built for Modern Market Participants
              </h2>
              <p className={styles.sectionSubtitle}>
                {BRAND_CONFIG.name} Platform is designed to serve traders,
                investors, prop participants, and financial learners within one
                unified environment.
              </p>
            </div>

            <div className={styles.participantsGrid}>
              {PARTICIPANT_BENEFITS.map((item, idx) => (
                <div key={idx} className={styles.participantFeatureItem}>
                  <div className={styles.checkIconBox}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className={styles.participantFeatureTitle}>
                      {item.title}
                    </div>
                    <div className={styles.participantFeatureDesc}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* SECTION 4: STRUCTURED. SEPARATED. TRANSPARENT. */}
        <motion.section
          className={styles.pillarsSection}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65 }}
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPill}>CORE GOVERNANCE</span>
            <h2 className={styles.sectionTitle}>
              Structured. Separated. Transparent.
            </h2>
            <p className={styles.sectionSubtitle}>
              Institutional standards of operational separation and independent
              risk controls.
            </p>
          </div>

          <div className={styles.pillarsGrid}>
            {TRANSPARENCY_PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div key={idx} className={styles.pillarCard}>
                  <div
                    className={styles.pillarIconBox}
                    style={{
                      backgroundColor:
                        pillar.tone === 'gold'
                          ? 'rgba(245, 184, 46, 0.15)'
                          : pillar.tone === 'emerald'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(6, 182, 212, 0.15)',
                      color:
                        pillar.tone === 'gold'
                          ? '#F5B82E'
                          : pillar.tone === 'emerald'
                            ? '#10B981'
                            : '#06B6D4',
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                  <p className={styles.pillarBody}>{pillar.desc}</p>
                </div>
              );
            })}
          </div>

          <div className={styles.centerCtaWrap}>
            <Link href="/about">
              <Button variant="ghost" size="md">
                View Performance & Transparency Framework →
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* SECTION 5: INTEGRATED FINANCIAL INFRASTRUCTURE */}
        <motion.section
          className={styles.integratedSection}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65 }}
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionPill}>SYSTEM RELIABILITY</span>
            <h2 className={styles.sectionTitle}>
              Integrated Financial Infrastructure
            </h2>
            <p className={styles.sectionSubtitle}>
              Ecosystem companies operate using established brokerage platforms,
              liquidity access, and professional trading environments to maintain
              execution efficiency and system stability.
            </p>
          </div>

          <div className={styles.integratedGrid}>
            {INFRASTRUCTURE_PILLARS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className={styles.integratedCard}>
                  <div className="flex items-center gap-2 mb-2 text-amber-400">
                    <Icon className="h-4 w-4" />
                    <h3 className={styles.integratedTitle}>{item.title}</h3>
                  </div>
                  <p className={styles.integratedDesc}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* SECTION 6: BUILD WITH NAVRIX BANNER */}
        <motion.section
          className={styles.buildBanner}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65 }}
        >
          <span className={styles.sectionPill}>ENTERPRISE & ALLOCATORS</span>
          <h2 className={styles.buildBannerTitle}>
            Access Multiple Financial Engines Through One Unified Ecosystem
          </h2>
          <p className={styles.buildBannerSubtitle}>
            Explore specialized ecosystem entities or connect with {BRAND_CONFIG.name}{' '}
            for partnership, institutional liquidity access, and collaboration
            opportunities.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/ecosystem">
              <Button variant="gold" size="lg">
                <Layers className="h-4 w-4" />
                Explore Our Ecosystem
              </Button>
            </Link>
            <Link href={primaryHref}>
              <Button variant="secondary" size="lg">
                Partner With {BRAND_CONFIG.name}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.section>
      </main>

      {/* DEDICATED MODULAR FOOTER (ZERO CONTACT INFORMATION) */}
      <SiteFooter />
    </div>
  );
}
