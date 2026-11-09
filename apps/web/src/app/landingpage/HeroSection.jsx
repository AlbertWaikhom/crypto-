import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Eye, EyeOff, Star } from 'lucide-react';
import { Aurora, SplitText, usePrefersReducedMotion } from './reactbits-primitives';
import {
  HERO_PORTFOLIO_TIMEFRAMES,
  MARKET_ASSETS,
  formatCurrencyPrice,
  useLandingMarketStore,
} from './market-data';
import './hero-section.css';

const HERO_CARD_SYMBOLS = ['BND', 'SPX', 'BTC', 'ETH'];
const TIMEFRAMES = ['1D', '7D', '1M', '3M', '1Y'];

export function HeroSection() {
  const reducedMotion = usePrefersReducedMotion();
  const {
    heroTimeframe,
    setHeroTimeframe,
    balanceHidden,
    toggleBalanceHidden,
    setSelectedSymbol,
    setSelectedCategory,
  } = useLandingMarketStore();

  const tfStats = HERO_PORTFOLIO_TIMEFRAMES[heroTimeframe] || HERO_PORTFOLIO_TIMEFRAMES['1D'];
  const portfolioAssets = React.useMemo(
    () =>
      HERO_CARD_SYMBOLS.map((sym) => MARKET_ASSETS.find((a) => a.symbol === sym)).filter(Boolean),
    [],
  );

  const handleSelectAssetFromHero = (symbol) => {
    setSelectedCategory('all');
    setSelectedSymbol(symbol);
    const el = document.getElementById('markets');
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  const handleExploreMarkets = (event) => {
    event.preventDefault();
    const el = document.getElementById('markets');
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <section className="lp-hero-section" aria-label="NAVRIX Hero">
      {/* 02 · React Bits Aurora + Particles Background */}
      <Aurora showParticles />

      <div className="lp-hero-inner">
        {/* 01 · Hero Headline + SplitText (800ms reveal) */}
        <div className="lp-hero-copy">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="lp-hero-badge"
          >
            <span className="lp-hero-badge-star">
              <Star size={13} fill="#F5B82E" />
            </span>
            <span>Smart Stock Market, BND Coin & Crypto Platform</span>
          </motion.div>

          <h1 className="lp-hero-title">
            <SplitText
              text="Build your stock & crypto portfolio with clarity."
              highlightWords={['clarity.']}
              durationMs={800}
            />
          </h1>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="lp-hero-subtitle"
          >
            Invest across global <strong>Stock Market</strong> indices, <strong>BND Coin</strong>,
            and institutional crypto assets — track real-time markets and grow your portfolio on one
            secure sovereign platform.
          </motion.p>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="lp-hero-cta-row"
          >
            <Link to="/register" className="lp-btn-gold">
              <span>Get Started Free</span>
              <ArrowRight size={16} />
            </Link>

            <a href="#markets" onClick={handleExploreMarkets} className="lp-btn-secondary">
              <span>Explore Markets</span>
            </a>
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.48 }}
            className="lp-hero-trust-row"
          >
            <span className="lp-hero-trust-item">
              <span className="lp-hero-trust-icon">
                <Check size={11} strokeWidth={3} />
              </span>
              <span>Secure & Reliable</span>
            </span>

            <span className="lp-hero-trust-item">
              <span className="lp-hero-trust-icon">
                <Check size={11} strokeWidth={3} />
              </span>
              <span>Real-time Stock & BND Data</span>
            </span>

            <span className="lp-hero-trust-item">
              <span className="lp-hero-trust-icon">
                <Check size={11} strokeWidth={3} />
              </span>
              <span>Transparent & Simple</span>
            </span>
          </motion.div>
        </div>

        {/* 03 · PortfolioCard Entrance (900ms) + Continuous Floating 3D Coins (3–5s loop) */}
        <div className="lp-hero-stage">
          <div className="lp-portfolio-glow-pedestal" />

          {/* Floating Coin 1: BND Coin (3.8s loop) */}
          <motion.div
            animate={reducedMotion ? undefined : { y: [0, -13, 0], rotate: [-14, -9, -14] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            className="lp-floating-coin lp-coin-bnd"
            aria-hidden="true"
          >
            <span className="lp-coin-bnd-title">BND</span>
            <span className="lp-coin-bnd-sub">COIN</span>
          </motion.div>

          {/* Floating Coin 2: Stock Market S&P 500 Badge (4.6s loop) */}
          <motion.div
            animate={reducedMotion ? undefined : { y: [0, 12, 0], rotate: [12, 6, 12] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            className="lp-floating-coin lp-coin-spx"
            aria-hidden="true"
          >
            <span className="lp-coin-bnd-title" style={{ fontSize: '13px' }}>
              S&P
            </span>
            <span className="lp-coin-bnd-sub">500</span>
          </motion.div>

          {/* Floating Coin 3: Bitcoin (4.2s loop) */}
          <motion.div
            animate={reducedMotion ? undefined : { y: [0, -10, 0], rotate: [8, 14, 8] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            className="lp-floating-coin lp-coin-btc"
            aria-hidden="true"
          >
            ₿
          </motion.div>

          {/* Floating Coin 4: Ethereum (3.4s loop) */}
          <motion.div
            animate={reducedMotion ? undefined : { y: [0, 10, 0], rotate: [-8, -14, -8] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className="lp-floating-coin lp-coin-eth"
            aria-hidden="true"
          >
            Ξ
          </motion.div>

          {/* Main 3D Portfolio Preview Card (900ms Entrance) */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 34, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="lp-portfolio-phone"
          >
            <div className="lp-phone-notch" />

            <div className="lp-phone-header">
              <div className="lp-phone-title-group">
                <span className="lp-phone-brand-dot">
                  <img src="/brand/logo-mark.png" alt="NAVRIX" />
                </span>
                <span className="lp-phone-title">My Portfolio</span>
              </div>

              <button
                type="button"
                onClick={toggleBalanceHidden}
                className="lp-phone-eye-btn"
                aria-label={balanceHidden ? 'Show portfolio balance' : 'Hide portfolio balance'}
              >
                {balanceHidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div>
              <div className="lp-phone-balance-label">Total Balance</div>
              <div className="lp-phone-balance-value">
                {balanceHidden ? '$••,•••.••' : formatCurrencyPrice(tfStats.balance)}
              </div>
              <div className="lp-phone-balance-delta">
                <span>
                  +{tfStats.changePct.toFixed(2)}% ({tfStats.label})
                </span>
              </div>
            </div>

            {/* Sparkline Curve */}
            <div className="lp-phone-spark-wrap" aria-hidden="true">
              <svg viewBox="0 0 340 76" className="lp-phone-spark-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="navrixPhoneSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5B82E" stopOpacity="0.38" />
                    <stop offset="55%" stopColor="#10B981" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#070b14" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="navrixPhoneStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="60%" stopColor="#F5B82E" />
                    <stop offset="100%" stopColor="#FDE68A" />
                  </linearGradient>
                </defs>
                <path
                  d={`${tfStats.svgPath} L 334 74 L 6 74 Z`}
                  fill="url(#navrixPhoneSparkGrad)"
                />
                <path
                  d={tfStats.svgPath}
                  fill="none"
                  stroke="url(#navrixPhoneStrokeGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="334" cy="8" r="4.5" fill="#FDE68A" />
                <circle cx="334" cy="8" r="9" fill="rgba(245, 184, 46, 0.32)" />
              </svg>
            </div>

            {/* Interactive Timeframe Pills */}
            <div className="lp-phone-tf-row" role="tablist" aria-label="Portfolio Timeframe">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  role="tab"
                  aria-selected={heroTimeframe === tf}
                  onClick={() => setHeroTimeframe(tf)}
                  className={`lp-phone-tf-btn ${heroTimeframe === tf ? 'is-active' : ''}`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Featured Assets: BND Coin + Stock Market (S&P 500) + BTC + ETH */}
            <div className="lp-phone-assets-list">
              {portfolioAssets.map((asset) => (
                <button
                  key={asset.symbol}
                  type="button"
                  onClick={() => handleSelectAssetFromHero(asset.symbol)}
                  className="lp-phone-asset-row"
                >
                  <div className="lp-phone-asset-left">
                    <span
                      className="lp-phone-asset-icon"
                      style={{
                        background: asset.iconBg,
                        color: asset.iconTextColor,
                      }}
                    >
                      {asset.iconGlyph}
                    </span>
                    <div>
                      <div>
                        <span className="lp-phone-asset-symbol">{asset.symbol}</span>
                        <span className="lp-phone-asset-name">{asset.name}</span>
                      </div>
                      <span className="lp-phone-asset-tag">
                        {asset.category === 'stock'
                          ? 'STOCK MARKET'
                          : asset.symbol === 'BND'
                            ? 'BND COIN'
                            : 'CRYPTO'}
                      </span>
                    </div>
                  </div>

                  <div className="lp-phone-asset-right">
                    <div className="lp-phone-asset-price">{formatCurrencyPrice(asset.price)}</div>
                    <div className="lp-phone-asset-change">+{asset.change24h.toFixed(2)}%</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
