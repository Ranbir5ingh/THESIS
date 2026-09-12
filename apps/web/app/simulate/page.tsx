"use client";
import Link from "next/link";
import { FlaskConical, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const assets=[
  ["RELIANCE","Reliance Industries"],["TCS","Tata Consultancy Services"],["HDFCBANK","HDFC Bank"],["INFY","Infosys"],["NVDA","NVIDIA Corporation"],["AAPL","Apple Inc."],["MSFT","Microsoft Corporation"],["TSLA","Tesla Inc."]
];
export default function SimulatorHome(){return <div className="mx-auto max-w-5xl space-y-8"><div className="max-w-3xl"><p className="section-kicker">Decision lab</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Stress-test an <span className="text-[var(--accent)]">investment idea.</span></h1><p className="mt-4 text-[var(--muted)] sm:text-lg">Pick a company first. THESIS then builds scenarios from that company&apos;s own growth, valuation, quality and risk — plus a behavioral stress test.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{assets.map(([symbol,name])=><Link key={symbol} href={`/simulate/${symbol}`}><Card className="glass-hover p-5"><div className="flex items-start justify-between"><div><p className="text-[11px] text-[var(--muted)]">{symbol}</p><h2 className="mt-1 text-lg font-bold">{name}</h2></div><FlaskConical size={18} className="text-[var(--accent)]"/></div><div className="mt-7 flex items-center justify-between text-sm"><span className="text-[var(--muted)]">Run scenario</span><ArrowRight size={16}/></div></Card></Link>)}</div><Card className="border-[var(--accent)]/10 bg-[var(--accent)]/[.025] p-6"><p className="font-semibold">Can&apos;t find the company?</p><p className="mt-1 text-sm text-[var(--muted)]">Search it in Explore first, then open its asset page and choose the decision lab.</p><Link href="/explore" className="mt-4 inline-block"><Button variant="secondary">Find an asset <ArrowRight size={16}/></Button></Link></Card></div>}
