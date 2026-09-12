import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Button({ className, variant="primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary"|"secondary"|"ghost"|"danger" }) {
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50", variant === "primary" && "bg-[var(--accent)] text-black hover:brightness-105", variant === "secondary" && "border border-[var(--line)] bg-white/[.04] text-white hover:bg-white/[.08]", variant === "ghost" && "text-[var(--muted)] hover:bg-white/[.05] hover:text-white", variant === "danger" && "border border-red-500/20 bg-red-500/10 text-red-200", className)} {...props} />;
}
