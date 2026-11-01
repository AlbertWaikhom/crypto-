'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { SiteHeader } from '../../components/SiteHeader';

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <SiteHeader mode="sticky" />

      <main className="flex-1 max-w-3xl mx-auto px-5 py-12">
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30 mb-3">
            <FileText className="h-3.5 w-3.5" />
            TERMS & GOVERNANCE
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Last Updated: November 2026 · {BRAND_CONFIG.name} Platform Ecosystem
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-2">
              1. Platform Nature & Ecosystem Gateway
            </h2>
            <p>
              {BRAND_CONFIG.name} Platform operates as a structured financial
              ecosystem gateway connecting users to specialized independent
              financial companies. {BRAND_CONFIG.name} does not manage capital,
              execute discretionary trades, or provide regulated investment
              brokerage services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">
              2. Independent Entity Agreements
            </h2>
            <p>
              When participating with any ecosystem entity (including automated
              systems, hedge programs, hybrid capital pools, or education
              courses), you agree to the specific contractual terms, risk
              disclosures, and fee structures established directly by that
              respective company.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">
              3. User Responsibilities & Eligibility
            </h2>
            <p>
              Users must be of legal age in their jurisdiction and are solely
              responsible for complying with all applicable local financial, tax,
              and regulatory laws before accessing ecosystem services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">
              4. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by applicable law, {BRAND_CONFIG.name}{' '}
              Platform and its affiliates disclaim any liability for trading
              losses, market volatility, algorithmic execution delays, or third-party
              brokerage outages incurred through independent ecosystem companies.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80 py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex flex-wrap justify-center gap-5 text-slate-300 font-semibold">
            <Link href="/" className="hover:text-amber-400">Home</Link>
            <Link href="/about" className="hover:text-amber-400">About</Link>
            <Link href="/ecosystem" className="hover:text-amber-400">{BRAND_CONFIG.name} Ecosystem</Link>
            <Link href="/contact" className="hover:text-amber-400">Contact</Link>
            <Link href="/risk-disclosure" className="hover:text-amber-400">Risk Disclosure</Link>
            <Link href="/terms-conditions" className="hover:text-amber-400">Terms & Conditions</Link>
          </div>
          <p className="opacity-60">
            Copyright © 2026 {BRAND_CONFIG.name} Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
