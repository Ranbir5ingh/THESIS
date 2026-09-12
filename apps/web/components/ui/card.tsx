import { cn } from "@/lib/utils";
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-2xl border border-[var(--line)] bg-[var(--panel)]/90", className)} {...p} />; }
export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("p-5 pb-3", className)} {...p} />; }
export function CardTitle({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) { return <h3 className={cn("text-lg font-semibold tracking-tight", className)} {...p} />; }
export function CardContent({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("p-5 pt-2", className)} {...p} />; }
