import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { DB } from "../common/db.module";
import { query } from "../common/db";

const DEMO: Record<string, any> = {
  RELIANCE: { symbol: "RELIANCE", exchange: "NSE", name: "Reliance Industries", price: 1482.3, changePercent: 1.84, sector: "Energy & Conglomerates", pe: 24.6, marketCap: 2000000, revenueGrowth: 14.2, profitGrowth: 18.1, debtToEquity: 0.38, volatility: 38, maxDrawdown: 24, qualityScore: 88, riskScore: 42, hypeScore: 29, personalFit: 84 },
  TCS: { symbol: "TCS", exchange: "NSE", name: "Tata Consultancy Services", price: 3912, changePercent: -0.42, sector: "Information Technology", pe: 29.1, marketCap: 1400000, revenueGrowth: 7.8, profitGrowth: 9.4, debtToEquity: 0.08, volatility: 25, maxDrawdown: 19, qualityScore: 91, riskScore: 31, hypeScore: 21, personalFit: 88 },
  NVIDIA: { symbol: "NVDA", exchange: "NASDAQ", name: "NVIDIA Corporation", price: 177.21, changePercent: 2.7, sector: "Semiconductors", pe: 48.3, marketCap: 4300000, revenueGrowth: 42, profitGrowth: 51, debtToEquity: 0.18, volatility: 62, maxDrawdown: 36, qualityScore: 92, riskScore: 64, hypeScore: 87, personalFit: 68 },
  APPLE: { symbol: "AAPL", exchange: "NASDAQ", name: "Apple Inc.", price: 241.8, changePercent: 0.66, sector: "Technology", pe: 34.7, marketCap: 3600000, revenueGrowth: 6.4, profitGrowth: 8.2, debtToEquity: 1.46, volatility: 31, maxDrawdown: 22, qualityScore: 90, riskScore: 45, hypeScore: 48, personalFit: 79 },
};

@Injectable()
export class MarketService {
  constructor(@Inject(DB) private readonly pool: Pool | null) {}

  async search(q = "") {
    const normalized = q.trim().toUpperCase();
    if (!normalized) return Object.values(DEMO);
    return Object.values(DEMO).filter((a) => `${a.symbol} ${a.name}`.includes(normalized));
  }

  async getAsset(symbol: string) {
    const key = symbol.toUpperCase();
    if (DEMO[key]) return this.withLiveQuote(DEMO[key]);
    const fallback = { ...DEMO.RELIANCE, symbol: key, name: key };
    return this.withLiveQuote(fallback);
  }

  private async withLiveQuote(asset: any) {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) return asset;
    try {
      const avSymbol = asset.exchange === "NSE" ? `${asset.symbol}.BSE` : asset.symbol;
      const quoteUrl = new URL("https://www.alphavantage.co/query");
      quoteUrl.searchParams.set("function", "GLOBAL_QUOTE");
      quoteUrl.searchParams.set("symbol", avSymbol);
      quoteUrl.searchParams.set("apikey", apiKey);
      const response = await fetch(quoteUrl, { signal: AbortSignal.timeout(5000) });
      const json = await response.json() as any;
      const q = json?.["Global Quote"];
      if (!q?.["05. price"]) return asset;
      return { ...asset, price: Number(q["05. price"]), changePercent: Number(String(q["10. change percent"] ?? "0").replace("%", "")) };
    } catch {
      return asset;
    }
  }

  async analysis(symbol: string) {
    const asset = await this.getAsset(symbol);
    const fit = asset.personalFit;
    return {
      asset,
      market: { price: asset.price, changePercent: asset.changePercent },
      fundamentals: { pe: asset.pe, marketCap: asset.marketCap, revenueGrowth: asset.revenueGrowth, profitGrowth: asset.profitGrowth, debtToEquity: asset.debtToEquity },
      risk: { score: asset.riskScore, level: asset.riskScore <= 30 ? "low" : asset.riskScore <= 60 ? "moderate" : asset.riskScore <= 80 ? "high" : "very-high" },
      hype: { score: asset.hypeScore, level: asset.hypeScore <= 30 ? "low" : asset.hypeScore <= 60 ? "moderate" : asset.hypeScore <= 80 ? "high" : "extreme" },
      quality: { score: asset.qualityScore },
      personalFit: { score: fit },
      explanation: asset.hypeScore > 70 ? "Attention is rising faster than the fundamentals represented in this demo dataset." : "The current balance between business quality, valuation and attention looks comparatively measured.",
    };
  }

  async chart(symbol: string) {
    const asset = await this.getAsset(symbol);
    const points = Array.from({ length: 30 }, (_, i) => ({
      date: `D-${29 - i}`,
      price: Number((asset.price * (0.92 + i * 0.0025 + Math.sin(i / 3) * 0.012)).toFixed(2)),
    }));
    return points;
  }

  async persistSnapshot(symbol: string) {
    if (!this.pool) return;
    const a = await this.getAsset(symbol);
    const asset = await query<{ id: string }>(this.pool, `INSERT INTO assets(symbol, exchange, name, sector, asset_type) VALUES($1,$2,$3,$4,$5) ON CONFLICT(symbol) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [a.symbol, a.exchange, a.name, a.sector, "stock"]);
    await query(this.pool, `INSERT INTO asset_snapshots(asset_id, price, pe, market_cap, revenue_growth, profit_growth, debt_to_equity, volatility, max_drawdown, risk_score, hype_score, quality_score, personal_fit) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [asset.rows[0].id, a.price, a.pe, a.marketCap, a.revenueGrowth, a.profitGrowth, a.debtToEquity, a.volatility, a.maxDrawdown, a.riskScore, a.hypeScore, a.qualityScore, a.personalFit]);
  }
}
