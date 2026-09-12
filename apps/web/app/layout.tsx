import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
export const metadata:Metadata={title:"THESIS — Don't invest because everyone else is.",description:"An AI investment decision coach that helps you understand, challenge, simulate and decide."};
export default function RootLayout({children}:{children:React.ReactNode}){return <Shell>{children}</Shell>}
