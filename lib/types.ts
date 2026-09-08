export type Freshness = 'LIVE' | 'DELAYED' | 'STALE' | 'CLOSED' | 'UNAVAILABLE';
export type ActionLabel = 'BUY BIAS' | 'WAIT' | 'SELL/AVOID';

export interface MarketQuote {
  symbol: string;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  source: string;
  timestamp: string | null;
  freshness: Freshness;
}

export interface TechnicalSnapshot {
  symbol: string;
  action: ActionLabel;
  confidence: number;
  support: number | null;
  pivot: number | null;
  resistance: number | null;
  rsi: number | null;
  emaFast: number | null;
  emaSlow: number | null;
  vwap: number | null;
}

export interface DerivativesSnapshot {
  symbol: string;
  fundingRate: number | null;
  openInterest: number | null;
  takerBuySellRatio: number | null;
  longShortRatio: number | null;
}
