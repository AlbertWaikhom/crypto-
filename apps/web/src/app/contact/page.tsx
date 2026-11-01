'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  HelpCircle,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button, GradientText, ShinyText } from '@navrix/ui';
import { SiteHeader } from '../../components/SiteHeader';
import styles from './contact.module.css';

export default function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 700);
  };

  return (
    <div className={styles.pageRoot}>
      <SiteHeader mode="sticky" />

      <main className={styles.mainContent}>
        <div className={styles.heroHeader}>
          <span className={styles.badgePill}>
            <Sparkles className="h-3 w-3 text-amber-400" />
            <ShinyText text="ECOSYSTEM ENGAGEMENT" />
          </span>

          <h1 className={styles.pageTitle}>
            Contact {BRAND_CONFIG.name} Platform —{' '}
            <GradientText variant="sovereign">
              Connect with Our Ecosystem Team
            </GradientText>
          </h1>

          <p className={styles.pageSubtitle}>
            Explore specialized ecosystem entities or connect with{' '}
            {BRAND_CONFIG.name} for partnership, institutional onboarding, and
            collaboration opportunities.
          </p>
        </div>

        <div className={styles.contactGrid}>
          {/* INQUIRY FORM */}
          <div className={styles.formCard}>
            <h2 className="text-xl font-extrabold mb-1">Send an Inquiry</h2>
            <p className="text-xs text-slate-400 mb-5">
              Our ecosystem relations desk typically responds within 1 business day.
            </p>

            {submitted ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white">
                  Inquiry Received
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                  Thank you for reaching out. A representative from the{' '}
                  {BRAND_CONFIG.name} ecosystem desk will review your details
                  promptly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-xs font-semibold text-amber-400 hover:underline"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="name" className={styles.label}>
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="Alice Mercer"
                    className={styles.input}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="email" className={styles.label}>
                    Business / Work Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="alice@company.com"
                    className={styles.input}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="subject" className={styles.label}>
                    Inquiry Scope
                  </label>
                  <select id="subject" className={styles.select} defaultValue="partnership">
                    <option value="partnership">
                      Ecosystem Entity Partnership & Integration
                    </option>
                    <option value="institutional">
                      Institutional Participation & Brokerage Connect
                    </option>
                    <option value="education">
                      Academy & Education Collaboration
                    </option>
                    <option value="compliance">
                      Governance & Compliance Inquiry
                    </option>
                    <option value="general">General Platform Inquiry</option>
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="message" className={styles.label}>
                    Message Details
                  </label>
                  <textarea
                    id="message"
                    required
                    placeholder="Describe your organization, background, and partnership goals..."
                    className={styles.textarea}
                  />
                </div>

                <Button
                  type="submit"
                  variant="gold"
                  size="md"
                  isLoading={loading}
                  className="w-full mt-2"
                >
                  Submit Inquiry
                </Button>
              </form>
            )}
          </div>

          {/* CONTACT INFO & FAQS */}
          <div className={styles.infoCol}>
            <div className={styles.infoCard}>
              <div className={styles.infoCardTitle}>
                <Mail className="h-4 w-4" />
                <span>Direct Ecosystem Desks</span>
              </div>
              <div className={styles.emailRow}>
                <div className={styles.emailItem}>
                  <span className={styles.emailLabel}>Partnership & BD</span>
                  <a
                    href="mailto:partners@navrixplatform.com"
                    className={styles.emailValue}
                  >
                    partners@navrixplatform.com
                  </a>
                </div>
                <div className={styles.emailItem}>
                  <span className={styles.emailLabel}>Institutional Liquidity</span>
                  <a
                    href="mailto:institutional@navrixplatform.com"
                    className={styles.emailValue}
                  >
                    institutional@navrixplatform.com
                  </a>
                </div>
                <div className={styles.emailItem}>
                  <span className={styles.emailLabel}>Compliance & Legal</span>
                  <a
                    href="mailto:compliance@navrixplatform.com"
                    className={styles.emailValue}
                  >
                    compliance@navrixplatform.com
                  </a>
                </div>
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoCardTitle}>
                <ShieldCheck className="h-4 w-4" />
                <span>Governance & Autonomy</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {BRAND_CONFIG.name} Platform is an ecosystem gateway. For
                questions regarding individual strategy models, MT5 links, or
                course schedules, participants may also visit each entity&apos;s
                official website directly via the{' '}
                <Link href="/ecosystem" className="text-amber-400 hover:underline">
                  Ecosystem Directory
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-10 px-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex flex-wrap justify-center gap-5 text-slate-300 font-semibold">
            <Link href="/" className="hover:text-amber-400">Home</Link>
            <Link href="/about" className="hover:text-amber-400">About</Link>
            <Link href="/ecosystem" className="hover:text-amber-400">{BRAND_CONFIG.name} Ecosystem</Link>
            <Link href="/contact" className="hover:text-amber-400">Contact</Link>
            <Link href="/risk-disclosure" className="hover:text-amber-400">Risk Disclosure</Link>
            <Link href="/terms-conditions" className="hover:text-amber-400">Terms & Conditions</Link>
          </div>
          <p className="leading-relaxed opacity-75">
            {BRAND_CONFIG.name} Platform is a financial ecosystem service
            provider. It does not directly manage client funds, execute trades,
            or provide regulated investment advisory services. Each ecosystem
            company operates independently under its own structure and risk
            framework. Trading and investment activities involve risk, and
            capital loss is possible.
          </p>
          <p className="opacity-60">
            Copyright © 2026 {BRAND_CONFIG.name} Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
