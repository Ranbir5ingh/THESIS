"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
} & HTMLMotionProps<"button">;

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
        "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
        "disabled:cursor-not-allowed disabled:opacity-50",

        variant === "primary" &&
          "bg-[var(--accent)] text-black shadow-[0_12px_40px_rgba(217,255,98,.12)] hover:shadow-[0_16px_50px_rgba(217,255,98,.2)]",

        variant === "secondary" &&
          "border border-[var(--line)] bg-white/[.04] text-white hover:bg-white/[.08]",

        variant === "ghost" &&
          "text-[var(--muted)] hover:bg-white/[.05] hover:text-white",

        variant === "danger" &&
          "border border-[var(--danger)]/20 bg-[var(--danger)]/10 text-[var(--danger)]",

        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}