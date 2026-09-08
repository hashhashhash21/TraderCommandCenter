import { NextResponse } from 'next/server';
import type { MarketQuote } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function binanceQuote(symbol:string):Promise<MarketQuote>{
  const empty:MarketQuote={symbol,price:null,changePercent:null,volume:null,source:'BINANCE',timestamp:null,freshness:'UNAVAILABLE'};
  try{
    const r=await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`,{cache:'no-store'});
    if(!r.ok) return empty;
    const j=await r.json();
    return {symbol,price:Number(j.lastPrice),changePercent:Number(j.priceChangePercent),volume:Number(j.quoteVolume),source:'BINANCE SPOT',timestamp:new Date().toISOString(),freshness:'LIVE'};
  }catch{return empty;}
}

async function alpacaQuote(symbol:string):Promise<MarketQuote>{
  const empty:MarketQuote={symbol,price:null,changePercent:null,volume:null,source:'US API NOT CONFIGURED',timestamp:null,freshness:'UNAVAILABLE'};
  const key=process.env.ALPACA_API_KEY, secret=process.env.ALPACA_API_SECRET;
  if(!key||!secret) return empty;
  try{
    const r=await fetch(`https://data.alpaca.markets/v2/stocks/${symbol}/snapshot`,{headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret},cache:'no-store'});
    if(!r.ok) return {...empty,source:'ALPACA'};
    const j=await r.json();
    const price=Number(j?.latestTrade?.p ?? j?.minuteBar?.c ?? j?.dailyBar?.c);
    const prev=Number(j?.prevDailyBar?.c);
    return {symbol,price:Number.isFinite(price)?price:null,changePercent:Number.isFinite(price)&&Number.isFinite(prev)&&prev!==0?((price-prev)/prev)*100:null,volume:Number(j?.dailyBar?.v)||null,source:'ALPACA IEX',timestamp:j?.latestTrade?.t??new Date().toISOString(),freshness:'LIVE'};
  }catch{return {...empty,source:'ALPACA'};}
}

export async function GET(){
  const [btc,eth,bmnrb,bmnu,soxl,soxs]=await Promise.all([
    binanceQuote('BTCUSDT'),
    binanceQuote('ETHUSDT'),
    binanceQuote('BMNRBUSDT'),
    alpacaQuote('BMNU'),
    alpacaQuote('SOXL'),
    alpacaQuote('SOXS')
  ]);
  bmnrb.symbol='BMNRB/USDT';
  return NextResponse.json({quotes:[btc,eth,bmnrb,bmnu,soxl,soxs],timestamp:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
}
