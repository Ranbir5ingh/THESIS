"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowUpRight, LoaderCircle, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/lib/api";
import { moneyForCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/primitives";

const quick = ["RELIANCE","TCS","NVDA","AAPL","MSFT","TSLA"];

export default function Explore(){
  const router=useRouter(); const params=useSearchParams(); const requestId=useRef(0);
  const [q,setQ]=useState(""); const [data,setData]=useState<any[]>([]); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [focused,setFocused]=useState(false);
  useEffect(()=>{ const initial=params.get("q")??""; setQ(initial); },[params]);
  useEffect(()=>{
    const term=q.trim(); const id=++requestId.current;
    const t=setTimeout(async()=>{
      if(id!==requestId.current)return;
      setLoading(true); setError("");
      try { const r=await api<any[]>(`/assets/search?q=${encodeURIComponent(term)}`); if(id===requestId.current)setData(r); }
      catch { if(id===requestId.current){setData([]);setError("Live search is temporarily unavailable. You can still open a saved/demo asset or check your market-data key.");} }
      finally { if(id===requestId.current)setLoading(false); }
    }, term?320:0);
    return()=>clearTimeout(t);
  },[q]);
  const submit=()=>{ const term=q.trim(); if(!term)return; router.replace(`/explore?q=${encodeURIComponent(term)}`); };
  const clear=()=>{setQ("");setError("");router.replace("/explore")};
  return <div className="space-y-8">
    <div className="max-w-3xl"><p className="section-kicker">Explore the market</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Start with a <span className="text-[var(--accent)]">question.</span></h1><p className="mt-4 text-[var(--muted)] sm:text-lg">Search a company or ticker. THESIS will show the business, the risk, the hype and how it fits your decision — not just a price.</p></div>
    <div className="relative max-w-4xl">
      <div className="sticky top-[84px] z-30 flex items-center gap-3 rounded-2xl border border-[var(--line-strong)] bg-[#0a0c10]/95 px-4 py-3 shadow-2xl backdrop-blur-2xl focus-within:border-[var(--accent)]/40">
        <Search className="text-[var(--muted)]" size={20}/><input autoFocus value={q} onFocus={()=>setFocused(true)} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Try Reliance, NVIDIA, Microsoft, TCS…" className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-2)]" aria-label="Search stocks and companies"/>
        {q&&<button onClick={clear} aria-label="Clear search" className="rounded-lg p-1 text-[var(--muted)] hover:text-white"><X size={16}/></button>}
        {loading&&<LoaderCircle className="animate-spin text-[var(--accent)]" size={16}/>}<Button variant="secondary" className="hidden sm:flex" onClick={submit}>Search</Button>
      </div>
      <AnimatePresence>{focused&&q.trim()&&<motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="absolute left-0 right-0 top-[62px] z-40 overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[#0d0f14]/98 p-2 shadow-2xl backdrop-blur-2xl">
        {loading?<div className="flex items-center gap-3 p-4 text-sm text-[var(--muted)]"><LoaderCircle className="animate-spin" size={16}/>Finding matching companies…</div>:data.slice(0,7).map(a=><button key={a.symbol} onClick={()=>router.push(`/asset/${encodeURIComponent(a.symbol)}`)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/[.05]"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[.06] text-xs font-bold">{String(a.symbol).slice(0,2)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.name}</p><p className="truncate text-[11px] text-[var(--muted)]">{a.symbol} · {a.exchange}</p></div><ArrowUpRight size={14} className="text-[var(--muted)]"/></button>)}{!loading&&!data.length&&<div className="p-4 text-sm text-[var(--muted)]">No matching company found. Try the full company name or ticker.</div>}</motion.div>}</AnimatePresence>
      <div className="mt-3 flex flex-wrap gap-2">{quick.map(s=><button key={s} onClick={()=>setQ(s)} className="pill px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-white/20 hover:text-white">{s}</button>)}</div>
    </div>
    {error&&<Card className="max-w-4xl border-[var(--warning)]/20 p-4 text-sm text-[var(--muted)]"><b className="text-white">Search needs live market data.</b> {error}</Card>}
    {q.trim()&&<div className="flex items-center justify-between"><div><p className="section-kicker">Results</p><h2 className="mt-1 text-2xl font-bold">Matches for “{q.trim()}”</h2></div><span className="text-xs text-[var(--muted)]">{data.length} result{data.length===1?"":"s"}</span></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.map((a,i)=><motion.div key={a.symbol} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*.025}}><Link href={`/asset/${encodeURIComponent(a.symbol)}`}><Card className="glass-hover h-full p-5"><div className="flex items-start justify-between"><div className="min-w-0"><p className="text-[11px] text-[var(--muted)]">{a.symbol} · {a.exchange}</p><h2 className="mt-1 truncate text-lg font-bold">{a.name}</h2><p className="mt-1 truncate text-xs text-[var(--muted)]">{a.sector}</p></div><ArrowUpRight size={17} className="shrink-0 text-[var(--muted)]"/></div><div className="mt-8 flex items-end justify-between"><div><p className="text-xs text-[var(--muted)]">{a.price==null?"Open for analysis":"Last price"}</p><p className="mt-1 text-2xl font-black">{a.price==null?"—":moneyForCurrency(Number(a.price),a.currency,2)}</p></div>{a.personalFit!=null&&<ScoreRing value={a.personalFit} size={62} label="fit"/>}</div>{a.riskScore!=null&&<div className="mt-6 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-4 text-xs"><span className="text-[var(--muted)]">Risk <b className="ml-1 text-white">{a.riskScore}</b></span><span className="text-[var(--muted)]">Hype <b className="ml-1 text-white">{a.hypeScore}</b></span></div>}</Card></Link></motion.div>)}</div>
    {!q.trim()&&<Card className="max-w-4xl border-[var(--accent)]/10 bg-[var(--accent)]/[.025] p-6 sm:p-8"><div className="flex gap-4"><Sparkles className="mt-1 shrink-0 text-[var(--accent)]"/><div><p className="font-bold">New here?</p><p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">Pick a familiar company above. On its page, start with “What does this mean for me?” before looking at the chart. That is the THESIS way to learn an investment.</p></div></div></Card>}
  </div>
}
