import React from 'react';
import { Info } from 'lucide-react';
import { AnimatedContent, CountUp } from './reactbits-primitives';
import './stats-fee.css';

export function StatsFeeSection() {
  return (
    <section className="lp-fees-section" aria-label="Transparent Fees and Platform Statistics">
      <AnimatedContent durationMs={600}>
        <div className="lp-fees-card">
          <div>
            <h2 className="lp-fees-copy-title">Transparent &amp; Fair Fees</h2>
            <p className="lp-fees-copy-sub">
              No hidden charges. A simple and clear fee structure for every Stock Market, BND Coin,
              and crypto investor.
            </p>
          </div>

          <div className="lp-fees-metrics-grid">
            <div className="lp-fee-metric-box">
              <div className="lp-fee-metric-value">
                <CountUp end={0.1} decimals={2} suffix="%" durationMs={1500} />
              </div>
              <div className="lp-fee-metric-label" title="Standard execution spread across markets">
                <span>Trading Fee</span>
                <span className="lp-fee-info-icon">
                  <Info size={13} />
                </span>
              </div>
            </div>

            <div className="lp-fee-metric-box">
              <div className="lp-fee-metric-value">
                <CountUp end={0} decimals={0} suffix="%" durationMs={1500} />
              </div>
              <div
                className="lp-fee-metric-label"
                title="Zero monthly or annual account maintenance fees"
              >
                <span>Account Fee</span>
                <span className="lp-fee-info-icon">
                  <Info size={13} />
                </span>
              </div>
            </div>

            <div className="lp-fee-metric-box">
              <div className="lp-fee-metric-value">
                <CountUp end={0} decimals={0} suffix="%" durationMs={1500} />
              </div>
              <div className="lp-fee-metric-label" title="Zero platform fee on USDT & BND deposits">
                <span>Deposit Fee</span>
                <span className="lp-fee-info-icon">
                  <Info size={13} />
                </span>
              </div>
            </div>

            <div className="lp-fee-metric-box">
              <div className="lp-fee-metric-value is-gold">
                <CountUp end={25400} decimals={0} suffix="+" durationMs={1500} />
              </div>
              <div className="lp-fee-metric-label" title="Verified global portfolios on NAVRIX">
                <span>Active Investors</span>
                <span className="lp-fee-info-icon">
                  <Info size={13} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </AnimatedContent>
    </section>
  );
}
