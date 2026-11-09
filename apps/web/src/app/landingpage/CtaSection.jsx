import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { AnimatedContent } from './reactbits-primitives';
import './cta-section.css';

export function CtaSection() {
  return (
    <section className="lp-cta-section" aria-label="Start Investing Call to Action">
      <AnimatedContent durationMs={600}>
        <div className="lp-cta-banner">
          {/* Ambient Glows */}
          <div className="lp-cta-glow-gold" aria-hidden="true" />
          <div className="lp-cta-glow-emerald" aria-hidden="true" />

          {/* Left Column: Heading, Subtitle, CTA Button, Trust Badges */}
          <div className="lp-cta-copy">
            <h2 className="lp-cta-title">
              Start your stock &amp; crypto investment journey today.
            </h2>
            <p className="lp-cta-desc">
              Create your free account and explore a smarter, safer way to grow your Stock Market,
              BND Coin, and institutional digital assets.
            </p>

            <div className="lp-cta-actions-group">
              <Link to="/register" className="lp-btn-gold lp-cta-main-btn">
                <span>Get Started Free</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="lp-cta-secondary-link">
                <span>Sign in to existing account →</span>
              </Link>
            </div>

            <div className="lp-cta-trust-strip">
              <span className="lp-cta-trust-pill">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Instant Setup</span>
              </span>
              <span className="lp-cta-trust-pill">
                <ShieldCheck size={13} className="text-amber-400" />
                <span>Zero Account Fees</span>
              </span>
              <span className="lp-cta-trust-pill">
                <Zap size={13} className="text-sky-400" />
                <span>Real-Time Settlement</span>
              </span>
            </div>
          </div>

          {/* Right Column: 3D Mobile Device Preview Card */}
          <div className="lp-cta-device-wrap" aria-hidden="true">
            <div className="lp-cta-phone-shadow" />

            <div className="lp-cta-mini-phone">
              <div className="lp-cta-phone-notch" />

              <div className="lp-cta-phone-header">
                <div className="lp-cta-phone-brand">
                  <img
                    src="/brand/logo-mark.png"
                    alt={BRAND_CONFIG.name}
                    width={20}
                    height={20}
                    style={{
                      width: '20px',
                      height: '20px',
                      maxWidth: '20px',
                      maxHeight: '20px',
                      objectFit: 'contain',
                    }}
                  />
                  <span>{BRAND_CONFIG.name}</span>
                </div>
                <span className="lp-cta-phone-status-dot" />
              </div>

              <div className="lp-cta-phone-body">
                <div className="lp-cta-phone-lbl">Total Balance</div>
                <div className="lp-cta-phone-val">$12,846.32</div>
                <div className="lp-cta-phone-chg">
                  <span>+7.38% (24h)</span>
                </div>

                {/* Mini Sparkline */}
                <div className="lp-cta-phone-spark-wrap">
                  <svg
                    viewBox="0 0 220 44"
                    className="lp-cta-phone-spark"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="ctaMiniPhoneFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F5B82E" stopOpacity="0.45" />
                        <stop offset="60%" stopColor="#10B981" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#070b14" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="ctaMiniPhoneStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="50%" stopColor="#F5B82E" />
                        <stop offset="100%" stopColor="#FDE68A" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 2 36 C 30 32, 50 24, 78 26 C 106 28, 130 16, 160 18 C 182 19, 200 9, 218 6 L 218 44 L 2 44 Z"
                      fill="url(#ctaMiniPhoneFill)"
                    />
                    <path
                      d="M 2 36 C 30 32, 50 24, 78 26 C 106 28, 130 16, 160 18 C 182 19, 200 9, 218 6"
                      fill="none"
                      stroke="url(#ctaMiniPhoneStroke)"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                    <circle cx="218" cy="6" r="3.5" fill="#FDE68A" />
                  </svg>
                </div>

                {/* Mini Asset Rows */}
                <div className="lp-cta-mini-assets">
                  <div className="lp-cta-mini-asset-row">
                    <span className="lp-cta-mini-asset-name">
                      <span className="lp-cta-mini-tag is-bnd">BND</span>
                      BND Coin
                    </span>
                    <span className="lp-cta-mini-asset-price">$42.85 (+8.64%)</span>
                  </div>
                  <div className="lp-cta-mini-asset-row">
                    <span className="lp-cta-mini-asset-name">
                      <span className="lp-cta-mini-tag is-stock">SPX</span>
                      S&amp;P 500
                    </span>
                    <span className="lp-cta-mini-asset-price">$5,984.20 (+1.42%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedContent>
    </section>
  );
}
