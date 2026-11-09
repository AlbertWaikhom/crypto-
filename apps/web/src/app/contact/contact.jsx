'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Globe, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button, GradientText, ShinyText, SpotlightCard } from '@navrix/ui';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader';
import styles from './contact.module.css';

const SPECIALIZED_DESKS = [
  {
    title: 'Institutional & Treasury',
    sla: '< 24h Desk SLA',
    desc: 'High-volume BEP-20 USDT onboarding, bespoke multi-engine sleeves, and private treasury routing.',
    email: 'institutional@navrixplatform.com',
  },
  {
    title: 'Ecosystem Partnerships',
    sla: 'BD & Integration',
    desc: 'Independent algorithmic desks, brokerage bridges, and liquidity providers applying for S.E.R.P.O. onboarding.',
    email: 'partners@navrixplatform.com',
  },
  {
    title: 'Compliance & Governance',
    sla: 'Legal & Audit',
    desc: 'Double-entry solvency documentation, entity separation inquiries, and jurisdictional due diligence.',
    email: 'compliance@navrixplatform.com',
  },
  {
    title: 'Academy & Prop Relations',
    sla: 'Cohort Support',
    desc: 'Regional educational partnerships, Funded Master cohort programs, and institutional mentorship.',
    email: 'academy@navrixplatform.com',
  },
];

const CORRIDORS = [
  'London · European Desk',
  'Dubai · MENA / DIFC',
  'Singapore · APAC Hub',
  'New York · Americas',
  'Frankfurt · Continental EU',
  'Mumbai · Equities & FX',
];

export default function ContactPage() {
  const [submittedTicket, setSubmittedTicket] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name') || 'Allocator');
    const scope = String(formData.get('scope') || 'Institutional Participation');

    setLoading(true);
    window.setTimeout(() => {
      const code = `NVX-DESK-${Math.floor(100000 + Math.random() * 900000)}`;
      setLoading(false);
      setSubmittedTicket({ code, name, scope });
    }, 550);
  };

  return (
    <div className={styles.pageRoot}>
      <SiteHeader mode="sticky" />

      <main className={styles.mainContent}>
        {/* 1. HERO + 4 SPECIALIZED DESK TILES */}
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
                <ShinyText text="INSTITUTIONAL RELATIONS & ONBOARDING" />
              </span>

              <h1 className={styles.pageTitle}>
                Connect With the {BRAND_CONFIG.name}{' '}
                <GradientText variant="sovereign">Ecosystem Desk.</GradientText>
              </h1>

              <p className={styles.pageSubtitle}>
                Reach our specialized onboarding, entity integration, and governance teams—whether
                you are structuring a multi-engine USDT treasury or integrating an autonomous
                financial company.
              </p>
            </motion.div>

            <div className={styles.desksGrid}>
              {SPECIALIZED_DESKS.map((desk) => (
                <SpotlightCard key={desk.title} tone="gold" className={styles.deskCard}>
                  <div>
                    <span className={styles.deskSla}>{desk.sla}</span>
                    <div className={styles.deskTitle}>{desk.title}</div>
                    <p className={styles.deskDesc}>{desk.desc}</p>
                  </div>

                  <a href={`mailto:${desk.email}`} className={styles.deskEmail}>
                    {desk.email}
                  </a>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>

        {/* 2. INTERACTIVE MULTI-TRACK INQUIRY WORKSPACE */}
        <section className={styles.workspaceSection}>
          <div className={styles.container}>
            <div className={styles.workspaceGrid}>
              <div className={styles.formPanel}>
                <div className="mb-5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    Direct Routing Dispatch
                  </span>
                  <h2 className="text-2xl font-extrabold mt-1 mb-1">
                    Submit an Institutional Brief
                  </h2>
                  <p className="text-xs m-0" style={{ color: 'var(--nv-text-muted)' }}>
                    Inquiries are routed directly to the designated relations desk within one
                    business day.
                  </p>
                </div>

                {submittedTicket ? (
                  <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-6">
                    <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                      <CheckCircle2 size={18} />
                      <span>Dispatch Logged · Reference {submittedTicket.code}</span>
                    </div>
                    <p className="text-sm mt-2 mb-4 leading-relaxed">
                      Thank you, <strong>{submittedTicket.name}</strong>. Your{' '}
                      <strong>{submittedTicket.scope}</strong> brief has been queued with our
                      Ecosystem Relations Desk. Keep reference{' '}
                      <code className="px-1.5 py-0.5 rounded bg-slate-900/60 text-amber-400">
                        {submittedTicket.code}
                      </code>{' '}
                      for priority follow-up.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setSubmittedTicket(null)}
                    >
                      Submit Another Inquiry
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className={styles.twoColFields}>
                      <div className={styles.fieldGroup}>
                        <label htmlFor="name" className={styles.label}>
                          Full Name
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          placeholder="Alice Mercer"
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.fieldGroup}>
                        <label htmlFor="email" className={styles.label}>
                          Work or Treasury Email
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          placeholder="alice@institution.com"
                          className={styles.input}
                        />
                      </div>
                    </div>

                    <div className={styles.twoColFields}>
                      <div className={styles.fieldGroup}>
                        <label htmlFor="profile" className={styles.label}>
                          Participant Profile
                        </label>
                        <select id="profile" name="profile" className={styles.select}>
                          <option value="Private / Family Treasury">
                            Private / Family Office Treasury
                          </option>
                          <option value="Individual USDT Allocator">
                            Individual USDT Allocator
                          </option>
                          <option value="Trading Engine / Quant Team">
                            Independent Trading Engine / Quant Desk
                          </option>
                          <option value="Prop Trader / Educator">
                            Proprietary Trader / Academy Partner
                          </option>
                        </select>
                      </div>

                      <div className={styles.fieldGroup}>
                        <label htmlFor="scope" className={styles.label}>
                          Routing Desk
                        </label>
                        <select id="scope" name="scope" className={styles.select}>
                          <option value="Institutional Treasury Onboarding">
                            Institutional Treasury Onboarding
                          </option>
                          <option value="Ecosystem Entity Integration">
                            Ecosystem Entity Partnership & Integration
                          </option>
                          <option value="Academy & Prop Collaboration">
                            Academy & Funded Program Collaboration
                          </option>
                          <option value="Compliance & Audit Inquiry">
                            Governance, Risk & Compliance Inquiry
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <label htmlFor="message" className={styles.label}>
                        Mandate or Partnership Brief
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        placeholder="Share your allocation horizon, preferred ecosystem engines, or integration specifications..."
                        className={styles.textarea}
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="gold"
                      size="lg"
                      isLoading={loading}
                      className="w-full"
                    >
                      <Mail size={15} />
                      <span>Dispatch Inquiry to Ecosystem Desk</span>
                    </Button>
                  </form>
                )}
              </div>

              {/* Right Column: Global Hub Coverage & Governance Note */}
              <div className={styles.sideCol}>
                <div className={styles.sideCard}>
                  <div className="flex items-center gap-2 text-sm font-extrabold text-amber-400">
                    <Globe size={16} />
                    <span>24/5 Global Corridor Coverage</span>
                  </div>
                  <p
                    className="text-xs leading-relaxed mt-2 mb-0"
                    style={{ color: 'var(--nv-text-muted)' }}
                  >
                    Our coordination desks align with major international liquidity sessions across
                    Europe, MENA, Asia-Pacific, and the Americas.
                  </p>
                  <div className={styles.corridorGrid}>
                    {CORRIDORS.map((c) => (
                      <div key={c} className={styles.corridorChip}>
                        {c}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.sideCard}>
                  <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-400">
                    <ShieldCheck size={16} />
                    <span>Independent Entity Support</span>
                  </div>
                  <p
                    className="text-xs leading-relaxed mt-2 mb-4"
                    style={{ color: 'var(--nv-text-muted)' }}
                  >
                    {BRAND_CONFIG.name} operates as an ecosystem gateway. For strategy-specific MT5
                    credentials, prop challenge rules, or live Zoom schedules, you can also access
                    each operating company directly through our Marketplace.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/ecosystem">
                      <Button variant="secondary" size="sm">
                        <span>Ecosystem Marketplace</span>
                        <ArrowRight size={13} />
                      </Button>
                    </Link>
                    <Link href="/risk-disclosure">
                      <Button variant="ghost" size="sm">
                        <span>Risk Disclosure</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
