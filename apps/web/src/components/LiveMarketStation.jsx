'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
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

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={styles.customTooltip}>
        <div className={styles.tooltipTime}>{data.time}</div>
        <div className={styles.tooltipPrice}>
          $
          {data.price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })}
        </div>
      </div>
    );
  }
  return null;
}

export function LiveMarketStation() {
  // Query backend for active market configuration
  const { data: config } = useQuery({
    queryKey: ['market-data-config'],
    queryFn: () => apiRequest('/market-data/config'),
    staleTime: 60000,
  });

  const activeSymbols = React.useMemo(() => {
    if (config?.symbols && Array.isArray(config.symbols)) {
      const active = config.symbols.filter((s) => s.isActive);
      if (active.length > 0) return active;
    }
    return DEFAULT_SYMBOLS;
  }, [config]);

  const [selectedSymbolId, setSelectedSymbolId] = React.useState('BTCUSDT');

  // Verify selected symbol is valid
  React.useEffect(() => {
    if (activeSymbols.length > 0 && !activeSymbols.some((s) => s.id === selectedSymbolId)) {
      setSelectedSymbolId(activeSymbols[0].id);
    }
  }, [activeSymbols, selectedSymbolId]);

  const currentSymbol =
    activeSymbols.find((s) => s.id === selectedSymbolId) || activeSymbols[0] || DEFAULT_SYMBOLS[0];

  // Ticker & Chart state
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

  const [flash, setFlash] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const [connectionStatus, setConnectionStatus] = React.useState('RECONNECTING');
  const [reconnectCount, setReconnectCount] = React.useState(0);

  const prevPriceRef = React.useRef(0);
  const flashTimeoutRef = React.useRef(null);
  const wsRef = React.useRef(null);
  const reconnectTimeoutRef = React.useRef(null);

  // Initial seed bootstrap via Binance 24hr ticker REST API for zero delay
  React.useEffect(() => {
    let cancelled = false;
    async function seedInitialData() {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${currentSymbol.symbol}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data || !data.lastPrice) return;

        const currentP = parseFloat(data.lastPrice);
        const highP = parseFloat(data.highPrice);
        const lowP = parseFloat(data.lowPrice);
        const chg = parseFloat(data.priceChange);
        const chgPct = parseFloat(data.priceChangePercent);
        const vol = parseFloat(data.volume);
        const qVol = parseFloat(data.quoteVolume);

        prevPriceRef.current = currentP;
        setTicker({
          symbol: data.symbol,
          price: currentP,
          priceChange: chg,
          priceChangePercent: chgPct,
          high: highP,
          low: lowP,
          volume: vol,
          quoteVolume: qVol,
          lastUpdated: Date.now(),
        });

        // Initialize history with recent simulated trajectory up to current price if empty
        setHistory((prev) => {
          if (prev.length > 5) return prev;
          const initialTicks = [];
          const now = Date.now();
          const base = currentP;
          const spread = (highP - lowP) * 0.1 || currentP * 0.005;

          for (let i = 24; i >= 0; i--) {
            const t = now - i * 4000;
            const variance = (Math.sin(i * 0.6) + Math.cos(i * 0.4)) * 0.5 * spread;
            const pt = i === 0 ? base : base - variance;
            initialTicks.push({
              time: new Date(t).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              price: Number(pt.toFixed(2)),
              timestamp: t,
            });
          }
          return initialTicks;
        });
      } catch {
        // Fallback or offline, live WS will handle
      }
    }

    seedInitialData();
    return () => {
      cancelled = true;
    };
  }, [currentSymbol.symbol]);

  // Connect to Binance WebSocket stream
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

    const streamName = currentSymbol.stream || `${currentSymbol.symbol.toLowerCase()}@ticker`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamName}`;

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
          if (!data || !data.c) return;

          const newPrice = parseFloat(data.c);
          const chg = parseFloat(data.p || '0');
          const chgPct = parseFloat(data.P || '0');
          const highP = parseFloat(data.h || '0');
          const lowP = parseFloat(data.l || '0');
          const vol = parseFloat(data.v || '0');
          const qVol = parseFloat(data.q || '0');

          // Flash movement trigger
          if (prevPriceRef.current > 0) {
            if (newPrice > prevPriceRef.current) {
              setFlash('up');
            } else if (newPrice < prevPriceRef.current) {
              setFlash('down');
            }
            if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
            flashTimeoutRef.current = setTimeout(() => setFlash(null), 700);
          }
          prevPriceRef.current = newPrice;

          setTicker({
            symbol: data.s,
            price: newPrice,
            priceChange: chg,
            priceChangePercent: chgPct,
            high: highP,
            low: lowP,
            volume: vol,
            quoteVolume: qVol,
            lastUpdated: Date.now(),
          });

          // Append to chart history (throttled to smooth updates)
          const now = Date.now();
          const timeStr = new Date(now).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          setHistory((prev) => {
            const last = prev[prev.length - 1];
            // Don't add more than one tick per 1.5 seconds to keep chart clean and crisp
            if (last && now - last.timestamp < 1500) {
              const updated = [...prev];
              updated[updated.length - 1] = { time: timeStr, price: newPrice, timestamp: now };
              return updated;
            }
            const next = [...prev, { time: timeStr, price: newPrice, timestamp: now }];
            if (next.length > 35) {
              return next.slice(next.length - 35);
            }
            return next;
          });
        } catch {
          // ignore parsing error
        }
      };

      ws.onerror = () => {
        setConnectionStatus('RECONNECTING');
      };

      ws.onclose = () => {
        setConnectionStatus('RECONNECTING');
        // Exponential backoff reconnect
        setReconnectCount((prev) => {
          const nextCount = prev + 1;
          const delay = Math.min(1000 * Math.pow(1.5, nextCount), 15000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
          return nextCount;
        });
      };
    } catch {
      setConnectionStatus('OFFLINE');
    }
  }, [currentSymbol]);

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

  // Compute min and max for chart YAxis auto-scaling
  const chartDomain = React.useMemo(() => {
    if (history.length === 0) return [0, 100];
    const prices = history.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.15 || min * 0.002;
    return [Math.max(0, Number((min - padding).toFixed(2))), Number((max + padding).toFixed(2))];
  }, [history]);

  const isPositive = ticker.priceChangePercent >= 0;

  return (
    <section className={styles.stationContainer} aria-label="Real-Time Market Station">
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
                Binance Spot WebSocket
              </span>
            </div>
            <div className={styles.stationSub}>
              Live price movements and ticking order book telemetry streamed directly via
              high-frequency WebSocket.
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

      {/* Symbol Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className={styles.symbolTabs}>
          {activeSymbols.map((item) => {
            const isSelected = item.id === currentSymbol.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedSymbolId(item.id)}
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
      </div>

      {/* Real-Time Ticker Metrics Bar */}
      <div className={styles.tickerGrid}>
        {/* Metric 1: Live Price & 24h Change */}
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
              $
              {ticker.price
                ? ticker.price.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '...'}
            </span>
            <span
              className={`${styles.changePill} ${isPositive ? styles.changeUp : styles.changeDown}`}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {isPositive ? '+' : ''}
              {ticker.priceChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Metric 2: 24h Range */}
        <div className={styles.metricBox}>
          <div className={styles.metricLabel}>24h High / Low</div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <div>
              <span className="text-[10px] text-slate-400 block">HIGH</span>
              <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
                $
                {ticker.high
                  ? ticker.high.toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : '...'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">LOW</span>
              <span className="text-xs sm:text-sm font-mono font-bold text-rose-400">
                $
                {ticker.low
                  ? ticker.low.toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: 24h Base Volume */}
        <div className={styles.metricBox}>
          <div className={styles.metricLabel}>24h Volume ({currentSymbol.baseAsset})</div>
          <div className="mt-1 font-mono text-sm sm:text-base font-bold text-slate-200">
            {ticker.volume
              ? ticker.volume.toLocaleString('en-US', { maximumFractionDigits: 2 })
              : '...'}{' '}
            {currentSymbol.baseAsset}
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

      {/* Interactive Real-Time Area Chart */}
      <div className={styles.chartCanvasWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="nvGoldMarketGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5b82e" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#f5b82e" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#f5b82e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={45}
            />
            <YAxis
              domain={chartDomain}
              orientation="right"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v.toLocaleString('en-US')}`}
              width={65}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#f5b82e"
              strokeWidth={2.2}
              fill="url(#nvGoldMarketGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer with Provider & Status Telemetry */}
      <div className={styles.chartFooter}>
        <div className={styles.feedProviderTag}>
          <span className="font-semibold text-slate-400">Stream Source:</span>
          <span className="font-mono text-amber-400">
            wss://stream.binance.com:9443/ws/{currentSymbol.stream}
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
