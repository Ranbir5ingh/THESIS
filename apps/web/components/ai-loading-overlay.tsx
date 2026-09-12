"use client";
import { BrainCircuit, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export function AiLoadingOverlay({ label = "THESIS is challenging your reasoning" }: { label?: string }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] overflow-hidden bg-[#030406]/88 backdrop-blur-xl">
    <div className="ai-blob ai-blob-a" /><div className="ai-blob ai-blob-b" /><div className="ai-blob ai-blob-c" />
    <div className="relative grid min-h-full place-items-center p-6"><div className="w-full max-w-md text-center">
      <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 9, repeat: Infinity, ease: "linear" }} className="mx-auto grid h-24 w-24 place-items-center rounded-[2rem] border border-white/10 bg-white/[.06] shadow-[0_0_100px_rgba(217,255,98,.14)] backdrop-blur-2xl"><BrainCircuit className="text-[var(--accent)]" size={32}/></motion.div>
      <motion.p animate={{ opacity: [.45, 1, .45] }} transition={{ duration: 1.8, repeat: Infinity }} className="mt-8 text-xs uppercase tracking-[.24em] text-[var(--muted)]">AI reasoning in progress</motion.p>
      <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{label}<span className="text-[var(--accent)]">.</span></h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">Reading your thesis against live market evidence, your Investor DNA and the assumptions hiding between the lines.</p>
      <div className="mx-auto mt-8 flex w-48 items-center gap-2"><span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[.08]"><motion.span className="block h-full w-1/2 rounded-full bg-[var(--accent)]" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}/></span><Sparkles size={14} className="text-[var(--accent)]"/></div>
    </div></div>
  </motion.div>;
}
