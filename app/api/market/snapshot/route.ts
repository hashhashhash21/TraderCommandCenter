import { NextResponse } from 'next/server';
import type { MarketQuote } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TIMEOUT_MS = 8000;

function unavailable(symbol: string, source = 'UNAVAILABLE'): MarketQuote {
  return {
    symbol,
    price: null,
    changePercent: null,
    volume: null,
    source,
    timestamp: null,
    freshness: 'UNAVAILABLE'
  };
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent': 'TraderCommandCenter/1.0',
        Accept: 'application/json',
        ...(init.headers || {})
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function binanceSpot(symbol: string): Promise<MarketQuote | null> {
  const bases = [
    'https://api.binance.com',
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com',
    'https://data-api.binance.vision'
  ];

  for (const base of bases) {
    try {
      const j = await fetchJson(`${base}/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`);
      const price = Number(j?.lastPrice);
      if (!Number.isFinite(price)) continue;
      return {
        symbol,
        price,
        changePercent: Number.isFinite(Number(j?.priceChangePercent)) ? Number(j.priceChangePercent) : null,
        volume: Number.isFinite(Number(j?.quoteVolume)) ? Number(j.quoteVolume) : null,
        source: base.includes('binance.vision') ? 'BINANCE PUBLIC DATA' : 'BINANCE SPOT',
        timestamp: new Date().toISOString(),
        freshness: 'LIVE'
      };
    } catch {
      // Try the next public Binance endpoint.
    }
  }
  return null;
}

async function coinGeckoCrypto(symbol: string): Promise<MarketQuote | null> {
  const id = symbol === 'BTCUSDT' ? 'bitcoin' : symbol === 'ETHUSDT' ? 'ethereum' : null;
  if (!id) return null;
  try {
    const j = await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_last_updated_at=true`
    );
    const row = j?.[id];
    const price = Number(row?.usd);
    if (!Number.isFinite(price)) return null;
    return {
      symbol,
      price,
      changePercent: Number.isFinite(Number(row?.usd_24h_change)) ? Number(row.usd_24h_change) : null,
      volume: Number.isFinite(Number(row?.usd_24h_vol)) ? Number(row.usd_24h_vol) : null,
      source: 'COINGECKO FALLBACK',
      timestamp: row?.last_updated_at ? new Date(Number(row.last_updated_at) * 1000).toISOString() : new Date().toISOString(),
      freshness: 'DELAYED'
    };
  } catch {
    return null;
  }
}

async function cryptoQuote(symbol: string): Promise<MarketQuote> {
  const binance = await binanceSpot(symbol);
  if (binance) return binance;
  const fallback = await coinGeckoCrypto(symbol);
  return fallback ?? unavailable(symbol, 'CRYPTO DATA UNAVAILABLE');
}

async function alpacaQuote(symbol: string): Promise<MarketQuote | null> {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_API_SECRET;
  if (!key || !secret) return null;
  try {
    const j = await fetchJson(`https://data.alpaca.markets/v2/stocks/${symbol}/snapshot`, {
      headers: {
        'APCA-API-KEY-ID': key,
        'APCA-API-SECRET-KEY': secret
      }
    });
    const price = Number(j?.latestTrade?.p ?? j?.minuteBar?.c ?? j?.dailyBar?.c);
    const prev = Number(j?.prevDailyBar?.c);
    if (!Number.isFinite(price)) return null;
    return {
      symbol,
      price,
      changePercent: Number.isFinite(prev) && prev !== 0 ? ((price - prev) / prev) * 100 : null,
      volume: Number.isFinite(Number(j?.dailyBar?.v)) ? Number(j.dailyBar.v) : null,
      source: 'ALPACA IEX',
      timestamp: j?.latestTrade?.t ?? new Date().toISOString(),
      freshness: 'LIVE'
    };
  } catch {
    return null;
  }
}

async function twelveDataQuote(symbol: string): Promise<MarketQuote | null> {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) return null;
  try {
    const j = await fetchJson(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`);
    const price = Number(j?.close);
    if (!Number.isFinite(price)) return null;
    return {
      symbol,
      price,
      changePercent: Number.isFinite(Number(j?.percent_change)) ? Number(j.percent_change) : null,
      volume: Number.isFinite(Number(j?.volume)) ? Number(j.volume) : null,
      source: 'TWELVE DATA',
      timestamp: j?.datetime ? new Date(j.datetime).toISOString() : new Date().toISOString(),
      freshness: 'DELAYED'
    };
  } catch {
    return null;
  }
}

async function finnhubQuote(symbol: string): Promise<MarketQuote | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  try {
    const j = await fetchJson(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`);
    const price = Number(j?.c);
    const prev = Number(j?.pc);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      symbol,
      price,
      changePercent: Number.isFinite(prev) && prev !== 0 ? ((price - prev) / prev) * 100 : null,
      volume: null,
      source: 'FINNHUB',
      timestamp: j?.t ? new Date(Number(j.t) * 1000).toISOString() : new Date().toISOString(),
      freshness: 'DELAYED'
    };
  } catch {
    return null;
  }
}

async function alphaVantageQuote(symbol: string): Promise<MarketQuote | null> {
  const key = process.env.ALPHAVANTAGE_API_KEY;
  if (!key) return null;
  try {
    const j = await fetchJson(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`);
    const q = j?.['Global Quote'];
    const price = Number(q?.['05. price']);
    if (!Number.isFinite(price)) return null;
    const pctRaw = String(q?.['10. change percent'] ?? '').replace('%', '');
    return {
      symbol,
      price,
      changePercent: Number.isFinite(Number(pctRaw)) ? Number(pctRaw) : null,
      volume: Number.isFinite(Number(q?.['06. volume'])) ? Number(q['06. volume']) : null,
      source: 'ALPHA VANTAGE',
      timestamp: new Date().toISOString(),
      freshness: 'DELAYED'
    };
  } catch {
    return null;
  }
}

async function stooqQuote(symbol: string): Promise<MarketQuote | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`https://stooq.com/q/l/?s=${encodeURIComponent(symbol.toLowerCase() + '.us')}&f=sd2t2ohlcv&h&e=csv`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'User-Agent': 'TraderCommandCenter/1.0' }
    });
    if (!response.ok) return null;
    const text = await response.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return null;
    const headers = lines[0].split(',');
    const values = lines[1].split(',');
    const row = Object.fromEntries(headers.map((h, i) => [h.trim().toLowerCase(), values[i]?.trim()]));
    const price = Number(row.close);
    if (!Number.isFinite(price) || price <= 0) return null;
    const date = row.date && row.time ? `${row.date}T${row.time}Z` : null;
    return {
      symbol,
      price,
      changePercent: null,
      volume: Number.isFinite(Number(row.volume)) ? Number(row.volume) : null,
      source: 'STOOQ DELAYED',
      timestamp: date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : new Date().toISOString(),
      freshness: 'DELAYED'
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function usQuote(symbol: string): Promise<MarketQuote> {
  const providers = [alpacaQuote, twelveDataQuote, finnhubQuote, alphaVantageQuote, stooqQuote];
  for (const provider of providers) {
    const quote = await provider(symbol);
    if (quote) return quote;
  }
  return unavailable(symbol, 'US DATA UNAVAILABLE');
}

export async function GET() {
  const [btc, eth, bmnrb, bmnu, soxl, soxs] = await Promise.all([
    cryptoQuote('BTCUSDT'),
    cryptoQuote('ETHUSDT'),
    cryptoQuote('BMNRBUSDT'),
    usQuote('BMNU'),
    usQuote('SOXL'),
    usQuote('SOXS')
  ]);

  bmnrb.symbol = 'BMNRB/USDT';

  return NextResponse.json(
    {
      ok: true,
      quotes: [btc, eth, bmnrb, bmnu, soxl, soxs],
      timestamp: new Date().toISOString(),
      diagnostics: {
        cryptoPrimary: 'Binance public REST',
        cryptoFallback: 'CoinGecko for BTC/ETH',
        usProviders: ['Alpaca', 'Twelve Data', 'Finnhub', 'Alpha Vantage', 'Stooq delayed fallback']
      }
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
