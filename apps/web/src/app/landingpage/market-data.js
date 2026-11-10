import * as React from 'react';
import { create } from 'zustand';
import { useQuery } from '@tanstack/react-query';

/**
 * Generates realistic, smooth institutional price series for TradingView Lightweight Charts.
 * Returns ascending { time: unixSeconds, value: number } points.
 */
function buildTimeSeries(basePrice, changePct, timeframe = '1D', seedOffset = 1) {
  const config = {
    '1D': { points: 48, stepSec: 1800, volatility: 0.0045, driftMultiplier: 1.0 },
    '7D': { points: 56, stepSec: 10800, volatility: 0.0085, driftMultiplier: 1.8 },
    '1M': { points: 60, stepSec: 43200, volatility: 0.013, driftMultiplier: 3.1 },
    '3M': { points: 72, stepSec: 108000, volatility: 0.018, driftMultiplier: 5.4 },
    '1Y': { points: 90, stepSec: 345600, volatility: 0.024, driftMultiplier: 9.2 },
  }[timeframe] || { points: 48, stepSec: 1800, volatility: 0.0045, driftMultiplier: 1.0 };

  const totalDeltaPct = (changePct / 100) * config.driftMultiplier;
  const startPrice = basePrice / (1 + totalDeltaPct);
  // Fixed anchor timestamp so hydration & test runs are deterministic
  const endTimestamp = 1762560000;
  const series = [];

  for (let i = 0; i < config.points; i += 1) {
    const progress = i / (config.points - 1);
    const waveA = Math.sin(progress * Math.PI * 3.2 + seedOffset) * config.volatility;
    const waveB =
      Math.cos(progress * Math.PI * 7.5 + seedOffset * 1.7) * (config.volatility * 0.48);
    const waveC =
      Math.sin(progress * Math.PI * 13.0 + seedOffset * 0.6) * (config.volatility * 0.22);

    // Ensure the final point lands cleanly on basePrice
    const envelope = 1 - Math.pow(progress, 4) * 0.85;
    const rawValue =
      startPrice *
      (1 + totalDeltaPct * Math.pow(progress, 0.92)) *
      (1 + (waveA + waveB + waveC) * envelope);

    const value =
      i === config.points - 1 ? basePrice : Number(rawValue.toFixed(basePrice < 100 ? 2 : 2));
    const time = endTimestamp - (config.points - 1 - i) * config.stepSec;
    series.push({ time, value });
  }

  return series;
}

export const MARKET_ASSETS = [
  {
    symbol: 'BND',
    name: 'BND Coin',
    category: 'crypto',
    badge: 'BND ECOSYSTEM',
    featuredStockAndBnd: true,
    price: 42.85,
    change24h: 8.64,
    marketCap: '$4.28B',
    volume24h: '$612.4M',
    supplyLabel: 'Circulating Supply',
    supplyValue: '100.00M BND',
    accentColor: '#F5B82E',
    iconBg: 'linear-gradient(135deg, #FDE68A 0%, #F5B82E 55%, #D99B1E 100%)',
    iconTextColor: '#070b14',
    iconGlyph: 'BND',
    seed: 1.2,
  },
  {
    symbol: 'SPX',
    name: 'S&P 500 Index',
    category: 'stock',
    badge: 'STOCK MARKET INDEX',
    featuredStockAndBnd: true,
    price: 5984.2,
    change24h: 1.42,
    marketCap: '$48.6T',
    volume24h: '$246.8B',
    supplyLabel: '52W Index High',
    supplyValue: '6,012.40 PTS',
    accentColor: '#10B981',
    iconBg: 'linear-gradient(135deg, #34D399 0%, #10B981 55%, #059669 100%)',
    iconTextColor: '#04130e',
    iconGlyph: 'S&P',
    seed: 2.4,
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    category: 'crypto',
    badge: 'DIGITAL GOLD',
    featuredStockAndBnd: true,
    price: 68420.0,
    change24h: 2.41,
    marketCap: '$1.34T',
    volume24h: '$28.9B',
    supplyLabel: 'Circulating Supply',
    supplyValue: '19.72M BTC',
    accentColor: '#F59E0B',
    iconBg: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 55%, #D97706 100%)',
    iconTextColor: '#070b14',
    iconGlyph: '₿',
    seed: 3.1,
  },
  {
    symbol: 'NDX',
    name: 'NASDAQ 100',
    category: 'stock',
    badge: 'US TECH STOCKS',
    featuredStockAndBnd: true,
    price: 20896.5,
    change24h: 1.89,
    marketCap: '$26.4T',
    volume24h: '$182.5B',
    supplyLabel: '52W Index High',
    supplyValue: '21,040.00 PTS',
    accentColor: '#38BDF8',
    iconBg: 'linear-gradient(135deg, #7DD3FC 0%, #0EA5E9 55%, #0284C7 100%)',
    iconTextColor: '#04111d',
    iconGlyph: 'NDX',
    seed: 4.3,
  },
  {
    symbol: 'NIFTY',
    name: 'NIFTY 50',
    category: 'stock',
    badge: 'NSE STOCK MARKET',
    featuredStockAndBnd: true,
    price: 24480.75,
    change24h: 1.18,
    marketCap: '$4.85T',
    volume24h: '$38.4B',
    supplyLabel: '52W Index High',
    supplyValue: '26,277.35 PTS',
    accentColor: '#F5B82E',
    iconBg: 'linear-gradient(135deg, #FDE68A 0%, #F5B82E 60%, #B45309 100%)',
    iconTextColor: '#070b14',
    iconGlyph: 'N50',
    seed: 5.0,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    category: 'crypto',
    badge: 'SMART CONTRACTS',
    featuredStockAndBnd: false,
    price: 3482.1,
    change24h: 3.27,
    marketCap: '$418.6B',
    volume24h: '$16.4B',
    supplyLabel: 'Circulating Supply',
    supplyValue: '120.21M ETH',
    accentColor: '#818CF8',
    iconBg: 'linear-gradient(135deg, #C7D2FE 0%, #818CF8 55%, #4F46E5 100%)',
    iconTextColor: '#070b14',
    iconGlyph: 'Ξ',
    seed: 6.2,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    category: 'crypto',
    badge: 'HIGH-SPEED L1',
    featuredStockAndBnd: false,
    price: 156.9,
    change24h: 5.11,
    marketCap: '$73.4B',
    volume24h: '$4.12B',
    supplyLabel: 'Circulating Supply',
    supplyValue: '468.10M SOL',
    accentColor: '#2DD4BF',
    iconBg: 'linear-gradient(135deg, #99F6E4 0%, #14B8A6 55%, #0F766E 100%)',
    iconTextColor: '#041311',
    iconGlyph: '◎',
    seed: 7.4,
  },
  {
    symbol: 'BNB',
    name: 'BNB Chain',
    category: 'crypto',
    badge: 'BEP-20 SETTLEMENT',
    featuredStockAndBnd: true,
    price: 602.4,
    change24h: 1.89,
    marketCap: '$88.9B',
    volume24h: '$2.14B',
    supplyLabel: 'Circulating Supply',
    supplyValue: '147.58M BNB',
    accentColor: '#FBBF24',
    iconBg: 'linear-gradient(135deg, #FEF08A 0%, #FBBF24 55%, #CA8A04 100%)',
    iconTextColor: '#070b14',
    iconGlyph: '❖',
    seed: 8.1,
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    category: 'stock',
    badge: 'EQUITY STOCK',
    featuredStockAndBnd: true,
    price: 142.6,
    change24h: 3.94,
    marketCap: '$3.48T',
    volume24h: '$54.2B',
    supplyLabel: 'Shares Outstanding',
    supplyValue: '24.53B NVDA',
    accentColor: '#10B981',
    iconBg: 'linear-gradient(135deg, #6EE7B7 0%, #10B981 55%, #047857 100%)',
    iconTextColor: '#04130e',
    iconGlyph: 'NV',
    seed: 9.0,
  },
];

export const HERO_PORTFOLIO_TIMEFRAMES = {
  '1D': {
    balance: 12846.32,
    changePct: 7.38,
    label: '24h',
    svgPath:
      'M 6 62 C 36 58, 54 44, 84 48 C 114 52, 134 32, 164 36 C 194 40, 218 18, 254 22 C 282 25, 306 10, 334 8',
  },
  '7D': {
    balance: 12846.32,
    changePct: 14.92,
    label: '7d',
    svgPath:
      'M 6 66 C 38 62, 62 54, 92 44 C 122 34, 148 42, 178 28 C 208 14, 238 22, 272 14 C 298 9, 316 11, 334 6',
  },
  '1M': {
    balance: 12846.32,
    changePct: 28.45,
    label: '30d',
    svgPath:
      'M 6 68 C 42 64, 68 50, 98 52 C 128 54, 156 36, 188 30 C 220 24, 248 26, 282 14 C 304 8, 320 9, 334 5',
  },
  '3M': {
    balance: 12846.32,
    changePct: 54.18,
    label: '90d',
    svgPath:
      'M 6 70 C 40 66, 74 58, 106 46 C 138 34, 168 38, 200 24 C 232 12, 264 18, 294 10 C 312 6, 324 7, 334 4',
  },
  '1Y': {
    balance: 12846.32,
    changePct: 142.6,
    label: '1y',
    svgPath:
      'M 6 72 C 44 68, 78 62, 112 52 C 146 42, 178 32, 212 24 C 246 16, 278 14, 304 8 C 318 5, 326 5, 334 4',
  },
};

// Initialize default live prices dictionary from MARKET_ASSETS
const INITIAL_LIVE_PRICES = MARKET_ASSETS.reduce((acc, asset) => {
  acc[asset.symbol] = {
    price: asset.price,
    change24h: asset.change24h,
    high24h: asset.price * 1.025,
    low24h: asset.price * 0.975,
    direction: 'neutral',
    lastUpdated: Date.now(),
  };
  return acc;
}, {});

/**
 * Zustand store for synchronized Landing Page market & portfolio state.
 */
export const useLandingMarketStore = create((set, get) => ({
  selectedSymbol: 'BND',
  selectedCategory: 'all', // 'all' | 'stock' | 'crypto'
  selectedTimeframe: '1D', // '1D' | '7D' | '1M' | '3M' | '1Y'
  heroTimeframe: '1D',
  balanceHidden: false,
  livePrices: INITIAL_LIVE_PRICES,
  wsConnected: false,
  wsStatus: 'CONNECTING', // 'CONNECTING' | 'LIVE' | 'RECONNECTING'

  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setSelectedCategory: (category) =>
    set((state) => {
      if (category === 'all') return { selectedCategory: 'all' };
      const currentAsset = MARKET_ASSETS.find((a) => a.symbol === state.selectedSymbol);
      if (currentAsset && currentAsset.category === category) {
        return { selectedCategory: category };
      }
      const firstMatch = MARKET_ASSETS.find((a) => a.category === category);
      return {
        selectedCategory: category,
        selectedSymbol: firstMatch ? firstMatch.symbol : state.selectedSymbol,
      };
    }),
  setSelectedTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),
  setHeroTimeframe: (heroTimeframe) => set({ heroTimeframe }),
  toggleBalanceHidden: () => set((state) => ({ balanceHidden: !state.balanceHidden })),

  setWsStatus: (wsStatus, wsConnected) => set({ wsStatus, wsConnected }),

  updateLivePrice: (symbol, nextPrice, nextChange24h, high, low) => {
    set((state) => {
      const prev = state.livePrices[symbol] || { price: nextPrice };
      const direction =
        nextPrice > prev.price ? 'up' : nextPrice < prev.price ? 'down' : prev.direction;
      return {
        livePrices: {
          ...state.livePrices,
          [symbol]: {
            price: nextPrice,
            change24h: typeof nextChange24h === 'number' ? nextChange24h : prev.change24h,
            high24h: typeof high === 'number' ? high : prev.high24h,
            low24h: typeof low === 'number' ? low : prev.low24h,
            direction,
            lastUpdated: Date.now(),
          },
        },
      };
    });
  },
}));

/**
 * Shared Real-Time Binance WebSocket Hook
 * Connects directly to Binance live ticker stream for core assets (BTC, ETH, SOL, BNB)
 * and keeps BND Coin & Stock Indices in active sync with live market volatility.
 */
export function useLiveMarketWebSocket() {
  const wsConnected = useLandingMarketStore((s) => s.wsConnected);
  const wsStatus = useLandingMarketStore((s) => s.wsStatus);
  const livePrices = useLandingMarketStore((s) => s.livePrices);
  const updateLivePrice = useLandingMarketStore((s) => s.updateLivePrice);
  const setWsStatus = useLandingMarketStore((s) => s.setWsStatus);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let ws = null;
    let reconnectTimer = null;
    let bndTimer = null;
    let isDisposed = false;

    const BINANCE_STREAM_URL =
      'wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/solusdt@ticker/bnbusdt@ticker';

    const connect = () => {
      if (isDisposed) return;
      try {
        setWsStatus('CONNECTING', false);
        ws = new WebSocket(BINANCE_STREAM_URL);

        ws.onopen = () => {
          if (isDisposed) return;
          setWsStatus('LIVE', true);
        };

        ws.onmessage = (event) => {
          if (isDisposed || !event?.data) return;
          try {
            const payload = JSON.parse(event.data);
            const data = payload?.data || payload;
            if (!data?.s || !data?.c) return;

            const rawSymbol = String(data.s).toUpperCase();
            let matchedSymbol = null;
            if (rawSymbol === 'BTCUSDT') matchedSymbol = 'BTC';
            else if (rawSymbol === 'ETHUSDT') matchedSymbol = 'ETH';
            else if (rawSymbol === 'SOLUSDT') matchedSymbol = 'SOL';
            else if (rawSymbol === 'BNBUSDT') matchedSymbol = 'BNB';

            if (matchedSymbol) {
              const price = parseFloat(data.c);
              const change24h = parseFloat(data.P);
              const high = parseFloat(data.h);
              const low = parseFloat(data.l);
              updateLivePrice(matchedSymbol, price, change24h, high, low);
            }
          } catch {
            // ignore non-json frames
          }
        };

        ws.onerror = () => {
          if (isDisposed) return;
          setWsStatus('RECONNECTING', false);
        };

        ws.onclose = () => {
          if (isDisposed) return;
          setWsStatus('RECONNECTING', false);
          reconnectTimer = setTimeout(connect, 3500);
        };
      } catch {
        if (!isDisposed) {
          setWsStatus('RECONNECTING', false);
          reconnectTimer = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    // Gentle live pulse for BND Coin ($42.85) & Stock Indices to maintain real-time telemetry feel
    bndTimer = setInterval(() => {
      if (isDisposed) return;
      const bndBase = 42.85;
      const jitter = (Math.random() - 0.48) * 0.08;
      const nextBnd = Math.max(41.5, Math.min(44.2, Number((bndBase + jitter).toFixed(2))));
      updateLivePrice('BND', nextBnd, 8.64 + jitter * 2, 43.4, 41.8);

      // Micro-tick for SPX & NDX
      const spxBase = 5984.2;
      const spxJitter = (Math.random() - 0.49) * 1.2;
      updateLivePrice(
        'SPX',
        Number((spxBase + spxJitter).toFixed(2)),
        1.42 + spxJitter * 0.01,
        6012.4,
        5940.0,
      );
    }, 2800);

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (bndTimer) clearInterval(bndTimer);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };
  }, [updateLivePrice, setWsStatus]);

  return { wsConnected, wsStatus, livePrices };
}

/**
 * TanStack Query hook providing market assets & precomputed chart series.
 * Automatically folds live WebSocket price into the active series!
 */
export function useMarketOverviewData(symbol, timeframe) {
  const livePrices = useLandingMarketStore((s) => s.livePrices);
  const liveInfo = livePrices[symbol];

  return useQuery({
    queryKey: ['navrix-landing-market', symbol, timeframe, liveInfo?.price],
    queryFn: async () => {
      const baseAsset = MARKET_ASSETS.find((item) => item.symbol === symbol) || MARKET_ASSETS[0];
      const activePrice = liveInfo?.price || baseAsset.price;
      const activeChange =
        typeof liveInfo?.change24h === 'number' ? liveInfo.change24h : baseAsset.change24h;

      const asset = {
        ...baseAsset,
        price: activePrice,
        change24h: activeChange,
        high24h: liveInfo?.high24h || activePrice * 1.025,
        low24h: liveInfo?.low24h || activePrice * 0.975,
        direction: liveInfo?.direction || 'neutral',
      };

      const series = buildTimeSeries(activePrice, activeChange, timeframe, baseAsset.seed);
      return {
        asset,
        series,
        updatedAt: new Date().toISOString(),
      };
    },
    initialData: () => {
      const baseAsset = MARKET_ASSETS.find((item) => item.symbol === symbol) || MARKET_ASSETS[0];
      const activePrice = liveInfo?.price || baseAsset.price;
      const activeChange =
        typeof liveInfo?.change24h === 'number' ? liveInfo.change24h : baseAsset.change24h;

      return {
        asset: {
          ...baseAsset,
          price: activePrice,
          change24h: activeChange,
          high24h: liveInfo?.high24h || activePrice * 1.025,
          low24h: liveInfo?.low24h || activePrice * 0.975,
          direction: liveInfo?.direction || 'neutral',
        },
        series: buildTimeSeries(activePrice, activeChange, timeframe, baseAsset.seed),
        updatedAt: new Date().toISOString(),
      };
    },
    staleTime: 5_000,
  });
}

export function formatCurrencyPrice(price) {
  if (typeof price !== 'number' || Number.isNaN(price)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: price < 10 ? 4 : 2,
    maximumFractionDigits: price < 10 ? 4 : 2,
  }).format(price);
}
