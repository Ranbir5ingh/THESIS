export type RiskLevel = "low" | "moderate" | "high" | "very-high";
export type Decision = "CONSIDER" | "WAIT" | "RETHINK";

export interface AssetSummary {
  symbol: string;
  exchange: string;
  name: string;
  price: number;
  changePercent: number;
  sector: string;
  qualityScore: number;
  personalFit: number;
  riskScore: number;
  hypeScore: number;
}
