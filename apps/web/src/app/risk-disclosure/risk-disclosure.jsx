'use client';
import * as React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
export default function RiskDisclosurePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <SiteHeader mode="sticky" />

      <motion.main
        className="flex-1 max-w-3xl mx-auto px-5 py-12"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30 mb-3">
            <AlertTriangle className="h-3.5 w-3.5" />
            MANDATORY LEGAL DISCLOSURE
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Risk Disclosure Statement</h1>
          <p className="text-sm text-slate-400 mt-2">
            Last Updated: November 2026 · {BRAND_CONFIG.name} Platform Ecosystem
          </p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl border border-amber-400/30 bg-amber-400/5 text-amber-300 text-xs">
            <strong>Important Notice:</strong> {BRAND_CONFIG.name} Platform is a financial ecosystem
            service provider. It does not directly manage client funds, execute trades, or provide
            regulated investment advisory services. Each ecosystem company operates independently
            under its own structure and risk framework.
          </div>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">1. General Market & Capital Risk</h2>
            <p>
              Participation in digital asset, algorithmic trading, foreign exchange, and hedge
              systems involves substantial financial risk, including the potential loss of principal
              capital. Past performance of any ecosystem entity, model, or strategy is not
              indicative of future results.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">2. Independent Entity Separation</h2>
            <p>
              Each independent company within the {BRAND_CONFIG.name} ecosystem (including Botxp,
              Tradex0.3, ARB24x5, Novex Portfolio, Volatility Blaze, Funded Master, Stockarth
              Academy, and Finup Global) operates autonomously. Each entity maintains its own risk
              management parameters, drawdown limits, terms of service, and operational policies.
              Users must evaluate each entity independently prior to participation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">
              3. Technology & Algorithmic Execution Risks
            </h2>
            <p>
              Automated and semi-automated trading systems rely on algorithmic code, network
              connectivity, latency stability, and third-party brokerage bridges (such as MT5).
              Market anomalies, slippage, liquidity dry-ups, and connectivity interruptions may
              impact execution performance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">
              4. Educational Services Non-Advisory Status
            </h2>
            <p>
              Educational resources provided by Stockarth Academy and Finup Global are strictly for
              educational and informational purposes and do not constitute financial, investment,
              legal, or tax advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">5. User Due Diligence</h2>
            <p>
              Users are encouraged to review individual company disclosures, understand risk
              exposure, and conduct independent evaluation before participating in any ecosystem
              engine.
            </p>
          </section>
        </div>
      </motion.main>

      <SiteFooter />
    </div>
  );
}
