"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
export default function Watchlist(){const [items,setItems]=useState<any[]>([]);useEffect(()=>{api<any[]>('/watchlist').then(setItems).catch(()=>{})},[]);return <div><p className="text-xs uppercase tracking-[.18em] text-[var(--muted)]">Your radar</p><h1 className="mt-2 text-4xl font-black">Watchlist</h1><p className="mt-3 text-[var(--muted)]">A short list of assets worth understanding—not a list of things you must buy.</p><div className="mt-8 space-y-3">{items.map(a=><Link key={a.symbol} href={`/asset/${a.symbol}`}><Card className="flex items-center justify-between p-5 hover:border-white/20"><div><p className="text-xs text-[var(--muted)]">{a.symbol}</p><h2 className="mt-1 font-bold">{a.name}</h2></div><div className="hidden gap-8 text-sm sm:flex"><span>Fit <b>{a.personalFit}</b></span><span>Risk <b>{a.riskScore}</b></span><span>Hype <b>{a.hypeScore}</b></span></div><ChevronRight className="text-[var(--muted)]"/></Card></Link>)}</div><div className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]"><Bookmark size={14}/>Hype is attention, not a recommendation.</div></div>}
