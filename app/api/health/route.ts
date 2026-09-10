import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const configured = {
    alpaca: Boolean(process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET),
    twelveData: Boolean(process.env.TWELVEDATA_API_KEY),
    finnhub: Boolean(process.env.FINNHUB_API_KEY),
    alphaVantage: Boolean(process.env.ALPHAVANTAGE_API_KEY)
  };

  return NextResponse.json(
    {
      ok: true,
      app: 'Trader Command Center',
      timestamp: new Date().toISOString(),
      providers: {
        cryptoPrimary: 'Binance public REST',
        cryptoFallback: 'CoinGecko for BTC/ETH',
        usConfigured: configured,
        usFallback: 'Stooq delayed public quote'
      }
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
