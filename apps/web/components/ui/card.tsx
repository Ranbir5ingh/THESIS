import { cn } from "@/lib/utils";
import { ReactNode } from "react";
export function Card({children,className="",...props}:{children:ReactNode;className?:string}&React.HTMLAttributes<HTMLDivElement>){return <div className={cn("glass rounded-3xl",className)} {...props}>{children}</div>}
