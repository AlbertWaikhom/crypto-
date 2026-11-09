import React from 'react';
import { LogoLoop, usePrefersReducedMotion } from './reactbits-primitives';
import { MARKET_ASSETS, formatCurrencyPrice, useLandingMarketStore } from './market-data';
import './market-ticker.css';

export function MarketTicker() {
  const reducedMotion = usePrefersReducedMotion();
  const { selectedSymbol, setSelectedSymbol, setSelectedCategory } = useLandingMarketStore();

  const handleTickerClick = (symbol) => {
    setSelectedCategory('all');
    setSelectedSymbol(symbol);
    const chartEl = document.getElementById('markets');
    if (chartEl) {
      chartEl.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="lp-ticker-section" aria-label="Live Stock Market and BND Coin Ticker">
      <div className="lp-ticker-bar">
        <div className="lp-ticker-live-badge">
          <span className="lp-ticker-live-dot" />
          <span>Market Live</span>
        </div>

        <LogoLoop
          items={MARKET_ASSETS}
          durationSec={26}
          pauseOnHover
          renderItem={(asset) => {
            const isSelected = selectedSymbol === asset.symbol;
            const marketClass =
              asset.symbol === 'BND'
                ? 'is-bnd'
                : asset.category === 'stock'
                  ? 'is-stock'
                  : 'is-crypto';
            const marketTag =
              asset.symbol === 'BND' ? 'BND COIN' : asset.category === 'stock' ? 'STOCK' : 'CRYPTO';

            return (
              <button
                type="button"
                onClick={() => handleTickerClick(asset.symbol)}
                className={`lp-ticker-chip ${isSelected ? 'is-selected' : ''}`}
              >
                <span
                  className="lp-ticker-chip-icon"
                  style={{
                    background: asset.iconBg,
                    color: asset.iconTextColor,
                  }}
                >
                  {asset.iconGlyph}
                </span>

                <span className="lp-ticker-chip-symbol">{asset.symbol}</span>
                <span className={`lp-ticker-chip-market ${marketClass}`}>{marketTag}</span>
                <span className="lp-ticker-chip-price">{formatCurrencyPrice(asset.price)}</span>
                <span className="lp-ticker-chip-delta">+{asset.change24h.toFixed(2)}%</span>

                <svg viewBox="0 0 40 16" className="lp-ticker-mini-spark" aria-hidden="true">
                  <path
                    d="M 1 13 L 9 10 L 16 12 L 24 6 L 31 8 L 39 2"
                    fill="none"
                    stroke={asset.symbol === 'BND' ? '#F5B82E' : '#34D399'}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            );
          }}
        />
      </div>
    </div>
  );
}
