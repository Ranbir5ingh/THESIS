import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";

export const metadata: Metadata = { title: "THESIS — Investment Decision Coach", description: "Understand. Challenge. Simulate. Decide." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Shell>{children}</Shell>;
}
