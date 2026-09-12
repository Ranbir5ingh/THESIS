"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, BrainCircuit, Compass, FlaskConical, Home, LineChart, Menu, Search, Sparkles, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  ["Home", "/", Home], ["Explore", "/explore", Compass], ["My Thesis", "/my-thesis", BrainCircuit], ["Simulator", "/simulate/NVIDIA", FlaskConical], ["Watchlist", "/watchlist", WalletCards], ["Learn", "/learn", BookOpen],
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const [open,setOpen]=useState(false);
  return <div className="min-h-screen">
    <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 border-r border-[var(--line)] bg-[#090b10]/95 p-4 backdrop-blur-xl transition-transform lg:translate-x-0", open?"translate-x-0":"-translate-x-full")}>
      <div className="flex items-center justify-between px-2 py-3"><Link href="/" className="text-xl font-black tracking-[-.04em]">THESIS<span className="text-[var(--accent)]">.</span></Link><button onClick={()=>setOpen(false)} className="lg:hidden"><X size={18}/></button></div>
      <div className="mt-6 space-y-1">{nav.map(([label,href,Icon])=>{const I=Icon as any; return <Link key={href as string} href={href as string} onClick={()=>setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", path===href?"bg-white/[.08] text-white":"text-[var(--muted)] hover:bg-white/[.04] hover:text-white")}><I size={17}/>{label as string}</Link>})}</div>
      <div className="mt-8 border-t border-[var(--line)] pt-5"><Link href="/investor-dna" className="flex items-center gap-3 rounded-xl bg-[var(--accent)]/10 p-3 text-sm text-[var(--accent)]"><Sparkles size={17}/><span><b>My Investor DNA</b><br/><span className="text-xs opacity-70">Moderate growth</span></span></Link></div>
    </aside>
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[#080a0f]/80 backdrop-blur-xl lg:pl-64"><div className="flex h-16 items-center justify-between px-4 lg:px-8"><button onClick={()=>setOpen(true)} className="lg:hidden"><Menu/></button><div className="hidden items-center gap-2 rounded-xl border border-[var(--line)] bg-white/[.03] px-3 py-2 text-sm text-[var(--muted)] sm:flex"><Search size={16}/>Search stocks, companies...</div><div className="ml-auto flex items-center gap-2"><Link href="/investor-dna" className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)]">Investor DNA</Link></div></div></header>
    <main className="lg:pl-64"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</div></main>
  </div>
}
