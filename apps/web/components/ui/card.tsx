import { cn } from "@/lib/utils";
import { ReactNode } from "react";
export function Card({ children, className = "", ...props }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass card-premium rounded-[1.75rem]", className)} {...props}>{children}</div>;
}
