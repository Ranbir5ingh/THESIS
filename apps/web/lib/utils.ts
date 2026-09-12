import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function money(v:number) { return new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:2 }).format(v); }


export const CURRENCY_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", CAD: "CA$", AUD: "A$", SGD: "S$" };

export function currencySymbol(currency?: string) {
  return CURRENCY_SYMBOLS[String(currency || "INR").toUpperCase()] || `${String(currency || "INR").toUpperCase()} `;
}

export function moneyForCurrency(value: number, currency = "INR", maximumFractionDigits = 2) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: String(currency).toUpperCase(), maximumFractionDigits }).format(Number(value));
  } catch {
    return `${currencySymbol(currency)}${Number(value).toLocaleString("en-IN", { maximumFractionDigits })}`;
  }
}
