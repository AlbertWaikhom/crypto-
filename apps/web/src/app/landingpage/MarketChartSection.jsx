import React from 'react';
import { useInView } from 'framer-motion';
import { AreaSeries, ColorType, CrosshairMode, LineStyle, createChart } from 'lightweight-charts';
import { AnimatedContent, usePrefersReducedMotion } from './reactbits-primitives';
import {
  MARKET_ASSETS,
  formatCurrencyPrice,
  useLandingMarketStore,
  useMarketOverviewData,
  useLiveMarketWebSocket,
} from './market-data';
import './market-chart.css';

const CATEGORIES = [
  { id: 'all', label: 'All (Stock + BND + Crypto)' },
  { id: 'stock', label: 'Stock Market' },
  { id: 'crypto', label: 'BND Coin & Crypto' },
];

const TIMEFRAMES = ['1D', '7D', '1M', '3M', '1Y'];
const QUICK_STRIP_SYMBOLS = ['BND', 'SPX', 'NDX', 'NIFTY'];

export function MarketChartSection() {
  const sectionRef = React.useRef(null);
  const chartContainerRef = React.useRef(null);
  const chartInstanceRef = React.useRef(null);
  const seriesInstanceRef = React.useRef(null);
  const hasDoneInitialRevealRef = React.useRef(false);

  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const reducedMotion = usePrefersReducedMotion();

  const {
    selectedSymbol,
    selectedCategory,
    selectedTimeframe,
    setSelectedSymbol,
    setSelectedCategory,
    setSelectedTimeframe,
  } = useLandingMarketStore();

  const { wsConnected, livePrices } = useLiveMarketWebSocket();

  const { data } = useMarketOverviewData(selectedSymbol, selectedTimeframe);
  const activeAsset = data?.asset || MARKET_ASSETS[0];
  const chartPoints = data?.series || [];

  const [hoverPrice, setHoverPrice] = React.useState(null);

  const filteredTabs = React.useMemo(() => {
    if (selectedCategory === 'all') {
      // Feature BND Coin + Stock Market indices + core Crypto prominently
      return MARKET_ASSETS.filter((item) =>
        ['BND', 'SPX', 'NDX', 'NIFTY', 'BTC', 'ETH', 'SOL', 'BNB'].includes(item.symbol),
      );
    }
    return MARKET_ASSETS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const quickStripAssets = React.useMemo(
    () =>
      QUICK_STRIP_SYMBOLS.map((sym) => MARKET_ASSETS.find((a) => a.symbol === sym)).filter(Boolean),
    [],
  );

  // Initialize TradingView Lightweight Charts instance once
  React.useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return undefined;

    const chart = createChart(container, {
      width: container.clientWidth || 640,
      height: container.clientHeight || 310,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.06)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.14)',
        scaleMargins: { top: 0.14, bottom: 0.12 },
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.14)',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(245, 184, 46, 0.5)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: 'rgba(245, 184, 46, 0.5)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#F5B82E',
        },
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: true },
      handleScale: { mouseWheel: false, pinch: true },
    });

    const seriesOptions = {
      lineColor: '#F5B82E',
      topColor: 'rgba(245, 184, 46, 0.36)',
      bottomColor: 'rgba(16, 185, 129, 0.02)',
      lineWidth: 3,
      priceLineVisible: true,
      priceLineColor: 'rgba(245, 184, 46, 0.55)',
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBackgroundColor: '#FDE68A',
      crosshairMarkerBorderColor: '#070b14',
    };

    const areaSeries =
      typeof chart.addSeries === 'function'
        ? chart.addSeries(AreaSeries, seriesOptions)
        : chart.addAreaSeries(seriesOptions);

    chartInstanceRef.current = chart;
    seriesInstanceRef.current = areaSeries;

    const handleCrosshairMove = (param) => {
      if (!param || !param.time || !param.seriesData) {
        setHoverPrice(null);
        return;
      }
      const point = param.seriesData.get(areaSeries);
      if (point && typeof point.value === 'number') {
        setHoverPrice(point.value);
      } else {
        setHoverPrice(null);
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
          chart.timeScale().fitContent();
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartInstanceRef.current = null;
      seriesInstanceRef.current = null;
    };
  }, []);

  // Update series color & 1,200ms progressive chart line drawing when visible or switched
  React.useEffect(() => {
    const chart = chartInstanceRef.current;
    const areaSeries = seriesInstanceRef.current;
    if (!chart || !areaSeries || chartPoints.length === 0) return undefined;

    const isStock = activeAsset.category === 'stock';
    areaSeries.applyOptions({
      lineColor: isStock ? '#10B981' : '#F5B82E',
      topColor: isStock ? 'rgba(16, 185, 129, 0.34)' : 'rgba(245, 184, 46, 0.36)',
      bottomColor: isStock ? 'rgba(245, 184, 46, 0.02)' : 'rgba(16, 185, 129, 0.02)',
      priceLineColor: isStock ? 'rgba(16, 185, 129, 0.55)' : 'rgba(245, 184, 46, 0.55)',
    });

    if (reducedMotion || !isInView) {
      areaSeries.setData(chartPoints);
      chart.timeScale().fitContent();
      return undefined;
    }

    // Timeline spec: 1,200ms on first section visible, 520ms on subsequent tab switches
    const drawDurationMs = hasDoneInitialRevealRef.current ? 520 : 1200;
    hasDoneInitialRevealRef.current = true;

    let rafId = null;
    let startTime = null;
    const totalPoints = chartPoints.length;

    const animateLine = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / drawDurationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 2.4);
      const count = Math.max(2, Math.round(eased * totalPoints));

      areaSeries.setData(chartPoints.slice(0, count));
      chart.timeScale().fitContent();

      if (progress < 1) {
        rafId = window.requestAnimationFrame(animateLine);
      } else {
        areaSeries.setData(chartPoints);
        chart.timeScale().fitContent();
      }
    };

    rafId = window.requestAnimationFrame(animateLine);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [chartPoints, activeAsset, isInView, reducedMotion]);

  const displayedPrice = hoverPrice !== null ? hoverPrice : activeAsset.price;

  return (
    <section
      id="markets"
      ref={sectionRef}
      className="lp-market-section"
      aria-label="Stock Market, BND Coin, and Crypto Overview"
    >
      <AnimatedContent durationMs={600}>
        <div className="lp-market-card">
          {/* Header Row */}
          <div className="lp-market-header">
            <div>
              <h2 className="lp-market-title">Market Overview</h2>
              <p className="lp-market-subtitle">
                Track global Stock Market indices, BND Coin, and top crypto assets in real time.
              </p>
            </div>

            <div className="lp-market-controls-right">
              {/* Market Segment Filter */}
              <div className="lp-market-category-bar" role="group" aria-label="Market Category">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`lp-market-cat-btn ${
                      selectedCategory === cat.id ? 'is-active' : ''
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Quick Symbol Tabs (BND, SPX, NDX, NIFTY, BTC, ETH, SOL, BNB) */}
              <div className="lp-market-symbol-tabs" role="tablist" aria-label="Select Asset">
                {filteredTabs.map((item) => {
                  const active = selectedSymbol === item.symbol;
                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedSymbol(item.symbol)}
                      className={`lp-market-sym-btn ${active ? 'is-active' : ''}`}
                    >
                      <span className="lp-market-sym-pill-dot" />
                      <span>{item.symbol === 'BND' ? 'BND Coin' : item.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Body Split: Left KPIs + Right TradingView Lightweight Chart */}
          <div className="lp-market-body">
            <div className="lp-market-kpi-col">
              <div>
                <div className="lp-market-asset-head">
                  <span
                    className="lp-market-asset-emblem"
                    style={{
                      background: activeAsset.iconBg,
                      color: activeAsset.iconTextColor,
                    }}
                  >
                    {activeAsset.iconGlyph}
                  </span>
                  <div>
                    <div className="lp-market-asset-title">
                      {activeAsset.name}
                      <span className="lp-market-asset-ticker">({activeAsset.symbol})</span>
                    </div>
                    <span className="lp-market-asset-badge">{activeAsset.badge}</span>
                  </div>
                </div>

                <div className="lp-market-big-price">{formatCurrencyPrice(displayedPrice)}</div>

                <div className="lp-market-delta-row">
                  <span className="lp-market-delta-val">+{activeAsset.change24h.toFixed(2)}%</span>
                  <span className="lp-market-delta-window">({selectedTimeframe})</span>
                </div>
              </div>

              <div className="lp-market-stats-list">
                <div className="lp-market-stat-row">
                  <span className="lp-market-stat-label">
                    {activeAsset.category === 'stock' ? 'Index / Market Cap' : 'Market Cap'}
                  </span>
                  <span className="lp-market-stat-value">{activeAsset.marketCap}</span>
                </div>

                <div className="lp-market-stat-row">
                  <span className="lp-market-stat-label">24h Volume</span>
                  <span className="lp-market-stat-value">{activeAsset.volume24h}</span>
                </div>

                <div className="lp-market-stat-row">
                  <span className="lp-market-stat-label">{activeAsset.supplyLabel}</span>
                  <span className="lp-market-stat-value">{activeAsset.supplyValue}</span>
                </div>
              </div>
            </div>

            <div className="lp-market-chart-col">
              <div className="lp-market-chart-toolbar">
                <span className="lp-market-feed-pill">
                  <span className="lp-market-feed-dot" />
                  <span>
                    {wsConnected
                      ? 'Live Binance WebSocket · Real-Time Stream'
                      : 'Live Market Feed · Interactive Chart'}
                  </span>
                </span>

                <div className="lp-market-tf-pills" role="group" aria-label="Chart Timeframe">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setSelectedTimeframe(tf)}
                      className={`lp-market-tf-btn ${selectedTimeframe === tf ? 'is-active' : ''}`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lp-tv-chart-shell">
                <div
                  ref={chartContainerRef}
                  className="lp-tv-chart-canvas"
                  data-testid="tradingview-market-chart"
                />
              </div>
            </div>
          </div>

          {/* Featured Stock Market + BND Coin Strip */}
          <div
            className="lp-market-quick-strip"
            aria-label="Featured Stock Market and BND Coin Benchmarks"
          >
            {quickStripAssets.map((item) => {
              const live = livePrices[item.symbol] || item;
              const livePrice = live.price || item.price;
              const liveChange =
                typeof live.change24h === 'number' ? live.change24h : item.change24h;
              const isUp = liveChange >= 0;

              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSymbol(item.symbol);
                  }}
                  className={`lp-market-quick-item ${
                    selectedSymbol === item.symbol ? 'is-active' : ''
                  }`}
                >
                  <div>
                    <span className="lp-market-quick-sym">
                      {item.symbol === 'BND' ? 'BND Coin (BND)' : `${item.name}`}
                    </span>
                    <span className="lp-market-quick-sub">
                      {item.symbol === 'BND' ? 'Native Ecosystem Coin' : 'Stock Market Benchmark'}
                    </span>
                  </div>
                  <div>
                    <span className="lp-market-quick-val">{formatCurrencyPrice(livePrice)}</span>
                    <span className={`lp-market-quick-chg ${isUp ? 'is-positive' : 'is-negative'}`}>
                      {isUp ? '+' : ''}
                      {liveChange.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </AnimatedContent>
    </section>
  );
}
