'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Clock,
  ExternalLink,
  Layers,
  Radio,
  RefreshCw,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import styles from './LiveMarketStation.module.css';

const DEFAULT_SYMBOLS = [
  {
    id: 'BTCUSDT',
    symbol: 'BTCUSDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    name: 'Bitcoin / Tether',
    stream: 'btcusdt@ticker',
    isActive: true,
  },
  {
    id: 'BNBUSDT',
    symbol: 'BNBUSDT',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    name: 'BNB Chain / Tether',
    stream: 'bnbusdt@ticker',
    isActive: true,
  },
  {
    id: 'ETHUSDT',
    symbol: 'ETHUSDT',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    name: 'Ethereum / Tether',
    stream: 'ethusdt@ticker',
    isActive: true,
  },
  {
    id: 'SOLUSDT',
    symbol: 'SOLUSDT',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    name: 'Solana / Tether',
    stream: 'solusdt@ticker',
    isActive: true,
  },
];

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '1d', value: '1d' },
];

function formatPrice(val, minDec = 2, maxDec = 2) {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  const num = Number(val);
  if (num === 0) return '0.00';
  if (num < 1) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }
  return num.toLocaleString('en-US', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  });
}

export function LiveMarketStation() {
  // Query backend for active market configuration
  const { data: config } = useQuery({
    queryKey: ['market-data-config'],
    queryFn: () => apiRequest('/market-data/config'),
    staleTime: 60000,
  });

  const activeSymbols = React.useMemo(() => {
    const rawList =
      config?.symbols && Array.isArray(config.symbols) && config.symbols.length > 0
        ? config.symbols.filter((s) => s.isActive)
        : DEFAULT_SYMBOLS;

    const list = rawList.length > 0 ? rawList : DEFAULT_SYMBOLS;

    return list.map((s) => ({
      ...s,
      id: s.id || s.symbol,
      symbol: s.symbol,
    }));
  }, [config]);

  const [selectedSymbolId, setSelectedSymbolId] = React.useState('BTCUSDT');
  const [interval, setInterval] = React.useState('1m');

  // Verify selected symbol is valid
  React.useEffect(() => {
    if (
      activeSymbols.length > 0 &&
      !activeSymbols.some((s) => s.symbol === selectedSymbolId || s.id === selectedSymbolId)
    ) {
      setSelectedSymbolId(activeSymbols[0].symbol);
    }
  }, [activeSymbols, selectedSymbolId]);

  const currentSymbol =
    activeSymbols.find((s) => s.symbol === selectedSymbolId || s.id === selectedSymbolId) ||
    activeSymbols[0] ||
    DEFAULT_SYMBOLS[0];

  // Ticker state (24hr stats)
  const [ticker, setTicker] = React.useState({
    symbol: currentSymbol.symbol,
    price: 0,
    priceChange: 0,
    priceChangePercent: 0,
    high: 0,
    low: 0,
    volume: 0,
    quoteVolume: 0,
    lastUpdated: Date.now(),
  });

  // Candlesticks array (OHLCV)
  const [candles, setCandles] = React.useState([]);
  const [isLoadingCandles, setIsLoadingCandles] = React.useState(true);
  const [flash, setFlash] = React.useState(null);
  const [connectionStatus, setConnectionStatus] = React.useState('RECONNECTING');
  const [reconnectCount, setReconnectCount] = React.useState(0);

  // Crosshair hover state
  const [hoverCandle, setHoverCandle] = React.useState(null);
  const [mousePos, setMousePos] = React.useState(null);

  const prevPriceRef = React.useRef(0);
  const flashTimeoutRef = React.useRef(null);
  const wsRef = React.useRef(null);
  const reconnectTimeoutRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const [chartDimensions, setChartDimensions] = React.useState({ width: 800, height: 260 });

  // Measure chart container dimensions
  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 50 && height > 50) {
          setChartDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch initial Japanese Candlesticks (klines) and 24h ticker via Binance REST
  React.useEffect(() => {
    let cancelled = false;
    setIsLoadingCandles(true);
    setCandles([]);
    setHoverCandle(null);
    setMousePos(null);
    prevPriceRef.current = 0;

    async function fetchKlinesAndTicker() {
      try {
        const [klinesRes, tickerRes] = await Promise.all([
          fetch(
            `https://api.binance.com/api/v3/klines?symbol=${currentSymbol.symbol}&interval=${interval}&limit=42`,
          ),
          fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${currentSymbol.symbol}`),
        ]);

        if (cancelled) return;

        if (tickerRes.ok) {
          const tData = await tickerRes.json();
          if (!cancelled && tData && tData.lastPrice) {
            const p = parseFloat(tData.lastPrice);
            prevPriceRef.current = p;
            setTicker({
              symbol: tData.symbol,
              price: p,
              priceChange: parseFloat(tData.priceChange),
              priceChangePercent: parseFloat(tData.priceChangePercent),
              high: parseFloat(tData.highPrice),
              low: parseFloat(tData.lowPrice),
              volume: parseFloat(tData.volume),
              quoteVolume: parseFloat(tData.quoteVolume),
              lastUpdated: Date.now(),
            });
          }
        }

        if (klinesRes.ok) {
          const kData = await klinesRes.json();
          if (!cancelled && Array.isArray(kData)) {
            const parsed = kData.map((k) => {
              const o = parseFloat(k[1]);
              const h = parseFloat(k[2]);
              const l = parseFloat(k[3]);
              const c = parseFloat(k[4]);
              const v = parseFloat(k[5]);
              const q = parseFloat(k[7]);
              return {
                timestamp: k[0],
                time: new Date(k[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                dateStr: new Date(k[0]).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                open: o,
                high: h,
                low: l,
                close: c,
                volume: v,
                quoteVolume: q,
                isBullish: c >= o,
              };
            });
            setCandles(parsed);
          }
        }
      } catch (err) {
        console.error('Failed to load Binance Kline feed:', err);
      } finally {
        if (!cancelled) setIsLoadingCandles(false);
      }
    }

    fetchKlinesAndTicker();

    return () => {
      cancelled = true;
    };
  }, [currentSymbol.symbol, interval]);

  // Connect to Binance Kline WebSocket stream
  const connectWebSocket = React.useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionStatus('RECONNECTING');

    const cleanSymbol = currentSymbol.symbol.toLowerCase();
    const wsUrl = `wss://stream.binance.com:9443/ws/${cleanSymbol}@kline_${interval}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('LIVE');
        setReconnectCount(0);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data || !data.k) return;

          const k = data.k;
          const openP = parseFloat(k.o);
          const closeP = parseFloat(k.c);
          const highP = parseFloat(k.h);
          const lowP = parseFloat(k.l);
          const vol = parseFloat(k.v);
          const qVol = parseFloat(k.q);
          const isBull = closeP >= openP;
          const kTime = k.t;

          // Price flash trigger
          if (prevPriceRef.current > 0) {
            if (closeP > prevPriceRef.current) {
              setFlash('up');
            } else if (closeP < prevPriceRef.current) {
              setFlash('down');
            }
            if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
            flashTimeoutRef.current = setTimeout(() => setFlash(null), 650);
          }
          prevPriceRef.current = closeP;

          // Update real-time ticker
          setTicker((prev) => ({
            ...prev,
            price: closeP,
            high: Math.max(prev.high, highP),
            low: prev.low === 0 ? lowP : Math.min(prev.low, lowP),
            lastUpdated: Date.now(),
          }));

          const updatedCandle = {
            timestamp: kTime,
            time: new Date(kTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dateStr: new Date(kTime).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            open: openP,
            high: highP,
            low: lowP,
            close: closeP,
            volume: vol,
            quoteVolume: qVol,
            isBullish: isBull,
          };

          // Seamlessly update candle array (update in-place or append new bar)
          setCandles((prevList) => {
            if (prevList.length === 0) return [updatedCandle];
            const last = prevList[prevList.length - 1];

            if (last.timestamp === kTime) {
              const next = [...prevList];
              next[next.length - 1] = updatedCandle;
              return next;
            } else if (kTime > last.timestamp) {
              const next = [...prevList, updatedCandle];
              if (next.length > 45) return next.slice(next.length - 45);
              return next;
            }
            return prevList;
          });
        } catch {}
      };

      ws.onerror = () => {
        setConnectionStatus('RECONNECTING');
      };

      ws.onclose = () => {
        setConnectionStatus('RECONNECTING');
        setReconnectCount((prev) => {
          const nextCount = prev + 1;
          const delay = Math.min(1000 * Math.pow(1.4, nextCount), 12000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
          return nextCount;
        });
      };
    } catch {
      setConnectionStatus('OFFLINE');
    }
  }, [currentSymbol.symbol, interval]);

  React.useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [connectWebSocket]);

  // SVG Chart Geometry Calculations
  const { width, height } = chartDimensions;
  const paddingLeft = 10;
  const paddingRight = 68;
  const paddingTop = 14;
  const paddingBottom = 24;

  const chartWidth = Math.max(80, width - paddingLeft - paddingRight);
  const chartHeight = Math.max(60, height - paddingTop - paddingBottom);

  const candleCount = candles.length;
  const step = candleCount > 0 ? chartWidth / candleCount : 10;
  const candleBodyWidth = Math.max(3, Math.min(16, step * 0.72));

  // Compute domain bounds for Y-Axis
  const { minPrice, maxPrice, priceStepGrid, maxVol } = React.useMemo(() => {
    if (candles.length === 0) {
      return { minPrice: 0, maxPrice: 100, priceStepGrid: [], maxVol: 1 };
    }
    let minP = Infinity;
    let maxP = -Infinity;
    let mVol = 0;
    for (const c of candles) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
      if (c.volume > mVol) mVol = c.volume;
    }

    if (minP === Infinity || maxP === -Infinity) {
      minP = 0;
      maxP = 100;
    }
    if (minP === maxP) {
      minP = minP * 0.99;
      maxP = maxP * 1.01;
    }

    const pad = (maxP - minP) * 0.08 || minP * 0.005;
    const domainMin = Math.max(0, minP - pad);
    const domainMax = maxP + pad;

    // 4 horizontal gridlines
    const grid = [];
    for (let i = 0; i < 4; i++) {
      grid.push(domainMin + ((domainMax - domainMin) * (3 - i)) / 3);
    }

    return {
      minPrice: domainMin,
      maxPrice: domainMax,
      priceStepGrid: grid,
      maxVol: mVol || 1,
    };
  }, [candles]);

  const scaleY = React.useCallback(
    (price) => {
      if (maxPrice <= minPrice) return paddingTop + chartHeight / 2;
      const pct = (price - minPrice) / (maxPrice - minPrice);
      return paddingTop + (1 - pct) * chartHeight;
    },
    [minPrice, maxPrice, paddingTop, chartHeight],
  );

  const getCandleX = React.useCallback(
    (index) => {
      return paddingLeft + index * step + step / 2;
    },
    [paddingLeft, step],
  );

  // Mouse move handler for interactive crosshair
  const handleMouseMove = (e) => {
    if (!containerRef.current || candles.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (
      x < paddingLeft ||
      x > width - paddingRight ||
      y < paddingTop ||
      y > height - paddingBottom
    ) {
      setHoverCandle(null);
      setMousePos(null);
      return;
    }

    const relX = x - paddingLeft;
    const idx = Math.min(candles.length - 1, Math.max(0, Math.floor(relX / step)));
    setHoverCandle(candles[idx]);
    setMousePos({ x, y, idx });
  };

  const handleMouseLeave = () => {
    setHoverCandle(null);
    setMousePos(null);
  };

  // Active HUD candle: either hovered candle or the latest candle in real-time
  const activeHudCandle = hoverCandle || (candles.length > 0 ? candles[candles.length - 1] : null);

  const hudChangePct = activeHudCandle
    ? (((activeHudCandle.close - activeHudCandle.open) / activeHudCandle.open) * 100).toFixed(2)
    : '0.00';
  const isHudPositive = Number(hudChangePct) >= 0;

  const isOverallPositive = ticker.priceChangePercent >= 0;

  return (
    <section
      className={styles.stationContainer}
      aria-label="Real-Time Japanese Candlestick Market Station"
    >
      {/* Top Bar: Title & Live Connection Status */}
      <div className={styles.topBar}>
        <div className={styles.stationHeading}>
          <div className={styles.headingIcon}>
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className={styles.titleArea}>
            <div className={styles.stationTitle}>
              Real-Time Global Market Station
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-300 hidden sm:inline-block">
                Japanese Candlestick WebSocket
              </span>
            </div>
            <div className={styles.stationSub}>
              Live Japanese Candlestick telemetry & ticking order book streamed directly from
              Binance Spot.
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div>
          {connectionStatus === 'LIVE' ? (
            <div className={`${styles.statusPill} ${styles.statusLive}`}>
              <span className={`${styles.statusDot} ${styles.pulseDot}`} />
              <span>Live WS Connected</span>
            </div>
          ) : connectionStatus === 'RECONNECTING' ? (
            <div className={`${styles.statusPill} ${styles.statusReconnecting}`}>
              <Radio className="h-3.5 w-3.5 animate-spin" />
              <span>Reconnecting {reconnectCount > 0 ? `(#${reconnectCount})` : ''}...</span>
            </div>
          ) : (
            <div className={`${styles.statusPill} ${styles.statusOffline}`}>
              <WifiOff className="h-3.5 w-3.5" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Symbol Tabs & Timeframe Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        {/* Symbol Selection Tabs */}
        <div className={styles.symbolTabs}>
          {activeSymbols.map((item) => {
            const isSelected = item.symbol === currentSymbol.symbol;
            return (
              <button
                key={item.symbol}
                type="button"
                onClick={() => setSelectedSymbolId(item.symbol)}
                className={`${styles.symbolTab} ${isSelected ? styles.symbolTabActive : ''}`}
              >
                <span>
                  {item.baseAsset} / {item.quoteAsset}
                </span>
                <span className={styles.tabBadge}>{item.name.split('/')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Timeframe Intervals */}
        <div className={styles.intervalTabs} role="group" aria-label="Select Candle Interval">
          <Clock className="w-3.5 h-3.5 text-slate-400 ml-1 mr-0.5 hidden sm:inline" />
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setInterval(tf.value)}
              className={`${styles.intervalBtn} ${interval === tf.value ? styles.intervalBtnActive : ''}`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Real-Time Ticker Metrics Bar */}
      <div className={styles.tickerGrid}>
        {/* Metric 1: Live Spot Price & 24h Change */}
        <div className={`${styles.metricBox} ${styles.metricBoxHighlight}`}>
          <div className={styles.metricLabel}>
            <span>{currentSymbol.symbol} Spot Price</span>
            <Activity className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className={styles.priceDisplay}>
            <span
              className={`${styles.livePrice} ${
                flash === 'up' ? styles.flashUp : flash === 'down' ? styles.flashDown : ''
              }`}
            >
              ${formatPrice(ticker.price)}
            </span>
            <span
              className={`${styles.changePill} ${
                isOverallPositive ? styles.changeUp : styles.changeDown
              }`}
            >
              {isOverallPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {isOverallPositive ? '+' : ''}
              {ticker.priceChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Metric 2: 24h High / Low */}
        <div className={styles.metricBox}>
          <div className={styles.metricLabel}>24h High / Low</div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <div>
              <span className="text-[10px] text-slate-400 block">HIGH</span>
              <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
                ${formatPrice(ticker.high)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">LOW</span>
              <span className="text-xs sm:text-sm font-mono font-bold text-rose-400">
                ${formatPrice(ticker.low)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: 24h Base Volume */}
        <div className={styles.metricBox}>
          <div className={styles.metricLabel}>24h Volume ({currentSymbol.baseAsset})</div>
          <div className="mt-1 font-mono text-sm sm:text-base font-bold text-slate-200">
            {formatPrice(ticker.volume, 2, 2)} {currentSymbol.baseAsset}
          </div>
        </div>

        {/* Metric 4: 24h Quote Turnover */}
        <div className={styles.metricBox}>
          <div className={styles.metricLabel}>24h Turnover (USDT)</div>
          <div className="mt-1 font-mono text-sm sm:text-base font-bold text-amber-300">
            ${ticker.quoteVolume ? (ticker.quoteVolume / 1000000).toFixed(2) : '0.00'}M USDT
          </div>
        </div>
      </div>

      {/* Japanese Candlestick HUD Telemetry Bar */}
      <div className={styles.candleHud}>
        <div className="flex items-center gap-1.5 font-bold text-amber-400">
          <BarChart2 className="w-3.5 h-3.5" />
          <span>
            {currentSymbol.baseAsset}/USDT [{interval}]
          </span>
        </div>
        {activeHudCandle ? (
          <>
            <div className={styles.hudItem}>
              <span className={styles.hudLabel}>Time:</span>
              <span className={styles.hudValue}>{activeHudCandle.time}</span>
            </div>
            <div className={styles.hudItem}>
              <span className={styles.hudLabel}>O:</span>
              <span className={styles.hudValue}>${formatPrice(activeHudCandle.open)}</span>
            </div>
            <div className={styles.hudItem}>
              <span className={styles.hudLabel}>H:</span>
              <span className="text-emerald-400 font-mono font-bold">
                ${formatPrice(activeHudCandle.high)}
              </span>
            </div>
            <div className={styles.hudItem}>
              <span className={styles.hudLabel}>L:</span>
              <span className="text-rose-400 font-mono font-bold">
                ${formatPrice(activeHudCandle.low)}
              </span>
            </div>
            <div className={styles.hudItem}>
              <span className={styles.hudLabel}>C:</span>
              <span
                className={`${styles.hudValue} ${
                  activeHudCandle.isBullish ? styles.hudBullish : styles.hudBearish
                }`}
              >
                ${formatPrice(activeHudCandle.close)}
              </span>
            </div>
            <div className={styles.hudItem}>
              <span className={styles.hudLabel}>Chg:</span>
              <span
                className={`font-mono font-bold ${
                  isHudPositive ? styles.hudBullish : styles.hudBearish
                }`}
              >
                {isHudPositive ? '+' : ''}
                {hudChangePct}%
              </span>
            </div>
            <div className={styles.hudItem}>
              <span className={styles.hudLabel}>Vol:</span>
              <span className="text-slate-300 font-mono">
                {formatPrice(activeHudCandle.volume, 2, 2)}
              </span>
            </div>
          </>
        ) : (
          <div className="text-slate-500 italic">Streaming kline telemetry...</div>
        )}
      </div>

      {/* Interactive Japanese Candlestick Chart Area */}
      <div
        ref={containerRef}
        className={styles.chartCanvasWrapper}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {isLoadingCandles && (
          <div className={styles.chartLoadingOverlay}>
            <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
            <span>Loading {currentSymbol.baseAsset} Japanese Candlesticks...</span>
          </div>
        )}

        <svg className={styles.svgChart} width={width} height={height}>
          {/* Subtle Gridlines & Price Scale Labels */}
          {priceStepGrid.map((p, idx) => {
            const y = scaleY(p);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.1)"
                  strokeDasharray="4 4"
                />
                <text
                  x={width - paddingRight + 6}
                  y={y + 3.5}
                  fill="#64748b"
                  fontSize={10}
                  fontFamily="var(--nv-font-sf)"
                >
                  ${formatPrice(p)}
                </text>
              </g>
            );
          })}

          {/* Volume bars (subtle bottom histogram) */}
          {candles.map((c, i) => {
            const cx = getCandleX(i);
            const volH = Math.max(2, (c.volume / maxVol) * (chartHeight * 0.22));
            const volY = paddingTop + chartHeight - volH;
            return (
              <rect
                key={`vol-${c.timestamp}`}
                x={cx - candleBodyWidth / 2}
                y={volY}
                width={candleBodyWidth}
                height={volH}
                fill={c.isBullish ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}
                rx={1}
              />
            );
          })}

          {/* Japanese Candlesticks: Wicks & Bodies */}
          {candles.map((c, i) => {
            const cx = getCandleX(i);
            const color = c.isBullish ? '#10b981' : '#f43f5e';
            const wickTop = scaleY(c.high);
            const wickBottom = scaleY(c.low);

            const bodyTop = scaleY(Math.max(c.open, c.close));
            const bodyBottom = scaleY(Math.min(c.open, c.close));
            const bodyH = Math.max(2.5, bodyBottom - bodyTop);

            return (
              <g key={`candle-${c.timestamp}`}>
                {/* High/Low Wick */}
                <line
                  x1={cx}
                  y1={wickTop}
                  x2={cx}
                  y2={wickBottom}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
                {/* Open/Close Candle Body */}
                <rect
                  x={cx - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyH}
                  fill={color}
                  stroke={color}
                  strokeWidth={1}
                  rx={1.5}
                />
              </g>
            );
          })}

          {/* Real-Time Live Price Horizontal Marker Line & Badge */}
          {ticker.price > 0 &&
            (() => {
              const liveY = scaleY(ticker.price);
              const latestBull = candles.length > 0 ? candles[candles.length - 1].isBullish : true;
              const liveColor = latestBull ? '#10b981' : '#f43f5e';
              return (
                <g>
                  {/* Dashed Tracking Line */}
                  <line
                    x1={paddingLeft}
                    y1={liveY}
                    x2={width - paddingRight}
                    y2={liveY}
                    stroke={liveColor}
                    strokeDasharray="3 3"
                    strokeWidth={1.2}
                    opacity={0.8}
                  />
                  {/* Pulsing Dot at Latest Candle */}
                  {candles.length > 0 && (
                    <circle
                      cx={getCandleX(candles.length - 1)}
                      cy={liveY}
                      r={3.5}
                      fill={liveColor}
                      stroke="#070b14"
                      strokeWidth={1.5}
                    />
                  )}
                  {/* Live Price Tag on Right Axis */}
                  <rect
                    x={width - paddingRight + 4}
                    y={liveY - 9}
                    width={paddingRight - 8}
                    height={18}
                    rx={4}
                    fill={liveColor}
                  />
                  <text
                    x={width - paddingRight + (paddingRight - 8) / 2 + 4}
                    y={liveY + 3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={10}
                    fontWeight={800}
                    fontFamily="var(--nv-font-sf)"
                  >
                    ${formatPrice(ticker.price)}
                  </text>
                </g>
              );
            })()}

          {/* Time Labels at Bottom */}
          {candles.map((c, i) => {
            // Pick intervals to not clutter the axis
            const stride = Math.max(4, Math.floor(candles.length / 6));
            if (i % stride !== 0 && i !== candles.length - 1) return null;
            const cx = getCandleX(i);
            return (
              <text
                key={`time-${c.timestamp}`}
                x={cx}
                y={height - 6}
                textAnchor="middle"
                fill="#64748b"
                fontSize={9.5}
                fontFamily="var(--nv-font-sf)"
              >
                {c.time}
              </text>
            );
          })}

          {/* Interactive Hover Crosshair */}
          {mousePos && hoverCandle && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={mousePos.x}
                y1={paddingTop}
                x2={mousePos.x}
                y2={height - paddingBottom}
                stroke="#f5b82e"
                strokeDasharray="2 2"
                strokeWidth={1}
                opacity={0.7}
              />
              {/* Horizontal Crosshair Line */}
              <line
                x1={paddingLeft}
                y1={mousePos.y}
                x2={width - paddingRight}
                y2={mousePos.y}
                stroke="#f5b82e"
                strokeDasharray="2 2"
                strokeWidth={1}
                opacity={0.7}
              />
              {/* Floating Time Pill at Bottom */}
              <rect
                x={mousePos.x - 26}
                y={height - paddingBottom}
                width={52}
                height={16}
                rx={3}
                fill="#0f172a"
                stroke="#f5b82e"
                strokeWidth={1}
              />
              <text
                x={mousePos.x}
                y={height - paddingBottom + 11.5}
                textAnchor="middle"
                fill="#fcd34d"
                fontSize={9}
                fontFamily="var(--nv-font-sf)"
                fontWeight={700}
              >
                {hoverCandle.time}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Chart Footer with Provider & Status Telemetry */}
      <div className={styles.chartFooter}>
        <div className={styles.feedProviderTag}>
          <span className="font-semibold text-slate-400">Stream Source:</span>
          <span className="font-mono text-amber-400">
            wss://stream.binance.com:9443/ws/{currentSymbol.symbol.toLowerCase()}@kline_{interval}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500">
            Updated: {new Date(ticker.lastUpdated).toLocaleTimeString()}
          </span>
          {connectionStatus !== 'LIVE' && (
            <button type="button" onClick={connectWebSocket} className={styles.reconnectButton}>
              <RefreshCw className="h-3 w-3 inline mr-1" /> Reconnect Feed
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default LiveMarketStation;
