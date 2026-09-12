"use client";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { ReactNode, useRef } from "react";

export function Reveal({ children, delay=0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return <motion.div initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.12}} transition={{duration:.65,delay,ease:[.22,1,.36,1]}} className={className}>{children}</motion.div>;
}

export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null); const x=useMotionValue(0); const y=useMotionValue(0); const rx=useSpring(useTransform(y,[-100,100],[4,-4]),{stiffness:180,damping:20}); const ry=useSpring(useTransform(x,[-100,100],[-4,4]),{stiffness:180,damping:20});
  return <motion.div ref={ref} onMouseMove={(e)=>{const r=ref.current?.getBoundingClientRect(); if(!r)return; x.set(e.clientX-r.left-r.width/2); y.set(e.clientY-r.top-r.height/2)}} onMouseLeave={()=>{x.set(0);y.set(0)}} style={{rotateX:rx,rotateY:ry,transformPerspective:900}} className={cn("glass card-premium glass-hover rounded-3xl",className)}>{children}</motion.div>;
}

export function ScoreRing({ value, size=92, label, tone="accent" }: { value:number|null|undefined; size?:number; label?:string; tone?:"accent"|"danger"|"blue" }) {
  const radius=(size-10)/2; const c=2*Math.PI*radius; const color=tone==="danger"?"#ff6b7a":tone==="blue"?"#8ab4ff":"#d9ff62";
  return <div className="relative shrink-0" style={{width:size,height:size}}><svg width={size} height={size} className="-rotate-90"><circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,.07)" strokeWidth="7" fill="none"/><motion.circle initial={{strokeDashoffset:c}} animate={{strokeDashoffset:c*(1-Math.max(0,Math.min(100,Number(value ?? 0)))/100)}} transition={{duration:1.1,ease:[.22,1,.36,1]}} cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth="7" strokeLinecap="round" fill="none" strokeDasharray={c}/></svg><div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-xl font-black tracking-tight">{value == null ? "—" : value}</div>{label&&<div className="text-[9px] uppercase tracking-[.14em] text-[var(--muted)]">{label}</div>}</div></div></div>;
}

export function Progress({ value, tone="accent" }: {value:number;tone?:"accent"|"danger"|"blue"}) { const bg=tone==="danger"?"bg-[var(--danger)]":tone==="blue"?"bg-[var(--blue)]":"bg-[var(--accent)]"; return <div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]"><motion.div initial={{width:0}} animate={{width:`${Math.max(0,Math.min(100,value))}%`}} transition={{duration:.8,ease:[.22,1,.36,1]}} className={cn("h-full rounded-full",bg)}/></div> }
