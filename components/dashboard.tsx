'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MarketQuote } from '@/lib/types';

const symbols = ['BTCUSDT','ETHUSDT','BMNRB/USDT','BMNU','SOXL','SOXS'];

export default function Dashboard(){
  const [quotes,setQuotes]=useState<MarketQuote[]>(symbols.map(symbol=>({symbol,price:null,changePercent:null,volume:null,source:'UNAVAILABLE',timestamp:null,freshness:'UNAVAILABLE'})));
  const [lang,setLang]=useState<'ar'|'en'>('ar');
  const [updated,setUpdated]=useState<string>('—');

  async function refresh(){
    try{
      const res=await fetch('/api/market/snapshot',{cache:'no-store'});
      const data=await res.json();
      if(Array.isArray(data?.quotes)) setQuotes(data.quotes);
      setUpdated(new Date().toLocaleTimeString(lang==='ar'?'ar-SA':'en-US',{timeZone:'Asia/Riyadh'}));
    }catch{}
  }

  useEffect(()=>{refresh(); const id=setInterval(refresh,30000); return()=>clearInterval(id)},[]);

  const rows=useMemo(()=>quotes.map(q=>({
    ...q,
    displayPrice:q.price==null?'—':q.price.toLocaleString(undefined,{maximumFractionDigits:q.price<10?4:2}),
    displayChange:q.changePercent==null?'—':`${q.changePercent.toFixed(2)}%`
  })),[quotes]);

  const ar=lang==='ar';
  return <main className="shell" dir={ar?'rtl':'ltr'}>
    <div className="topbar">
      <div className="brand"><h1>{ar?'مركز قيادة المتداول':'Trader Command Center'}</h1><p>{ar?'لوحة استخبارات سوقية متعددة المصادر':'Multi-source market intelligence dashboard'}</p></div>
      <div className="controls"><button className="btn" onClick={()=>setLang(ar?'en':'ar')}>{ar?'EN':'العربية'}</button><button className="btn" onClick={refresh}>{ar?'تحديث':'Refresh'}</button><span className="btn">{ar?'آخر تحديث':'Last update'}: {updated}</span></div>
    </div>

    <section className="grid kpis">{rows.map(q=><article className="card" key={q.symbol}>
      <div className="symbol">{q.symbol}</div><div className="price">{q.displayPrice}</div>
      <div className={q.changePercent==null?'muted':q.changePercent>=0?'good':'bad'}>{q.displayChange}</div>
      <div className="meta">{q.source} · {q.freshness}</div>
    </article>)}</section>

    <section className="section grid two">
      <div className="panel"><h2>{ar?'التحليل المباشر':'Direct Analysis'}</h2><div className="table-wrap"><table className="table"><thead><tr><th>{ar?'الأصل':'Asset'}</th><th>{ar?'السعر':'Price'}</th><th>{ar?'التغير':'Change'}</th><th>{ar?'المصدر':'Source'}</th><th>{ar?'الحالة':'Status'}</th></tr></thead><tbody>{rows.map(q=><tr key={q.symbol}><td>{q.symbol}</td><td>{q.displayPrice}</td><td className={q.changePercent==null?'muted':q.changePercent>=0?'good':'bad'}>{q.displayChange}</td><td>{q.source}</td><td>{q.freshness}</td></tr>)}</tbody></table></div></div>
      <div className="panel"><h2>{ar?'حالة البيانات':'Data Health'}</h2>{rows.map(q=><div className="metric" key={q.symbol}><span>{q.symbol}</span><span className="status"><span className={`dot ${q.freshness==='LIVE'?'live':q.freshness==='STALE'?'stale':''}`}></span>{q.freshness}</span></div>)}</div>
    </section>

    <section className="section grid three">
      <div className="panel"><h2>BMNRB Priority</h2><p className="muted">{ar?'يتم استخدام الرمز الفعلي فقط عند توفره من المصدر. لا يتم اختلاق أي بيانات.':'Only the actual provider symbol is used when available. No data is fabricated.'}</p></div>
      <div className="panel"><h2>BMNU</h2><p className="muted">{ar?'يعرض السعر المباشر عند توفر مزود أمريكي مهيأ.':'Displays direct U.S. quote when a configured provider is available.'}</p></div>
      <div className="panel"><h2>SOXL / SOXS</h2><p className="muted">{ar?'سياق أشباه الموصلات مع دعم SOXX وNVDA وAMD وAVGO وTSM عند توفرها.':'Semiconductor context with SOXX, NVDA, AMD, AVGO and TSM when available.'}</p></div>
    </section>

    <p className="notice">{ar?'هذه اللوحة أداة معلومات وتحليل سوقي وليست توصية استثمارية أو ضماناً للربح.':'This dashboard is a market-information and analysis tool, not investment advice or a profit guarantee.'}</p>
  </main>
}
