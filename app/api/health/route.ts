import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(){
  return NextResponse.json({
    ok:true,
    app:'Trader Command Center',
    timestamp:new Date().toISOString(),
    providers:{
      binance:'public-rest',
      us:process.env.ALPACA_API_KEY?'alpaca':process.env.TWELVEDATA_API_KEY?'twelvedata':process.env.FINNHUB_API_KEY?'finnhub':process.env.ALPHAVANTAGE_API_KEY?'alphavantage':'not-configured'
    }
  });
}
