import { Injectable } from "@nestjs/common";
import { MarketService } from "./market.service";

@Injectable()
export class SimulationService {
  constructor(private readonly market: MarketService) {}
  async simulate(input: { symbol: string; amount: number; years: number; behaviorResponse?: string }) {
    const asset = await this.market.getAsset(input.symbol);
    const baseRate = Math.max(-0.02, Math.min(0.18, asset.revenueGrowth / 100 * 0.55));
    const volatilityPenalty = asset.riskScore / 100 * 0.035;
    const bullRate = Math.min(0.28, baseRate + 0.06);
    const base = Math.max(-0.12, baseRate - volatilityPenalty);
    const bear = Math.max(-0.25, base - 0.11);
    const future = (rate: number) => Math.round(input.amount * Math.pow(1 + rate, input.years));
    return {
      disclaimer: "Educational scenario, not a price prediction or guaranteed return.",
      bull: { annualRate: Number((bullRate * 100).toFixed(1)), value: future(bullRate), cause: "Strong earnings growth with supportive valuation." },
      base: { annualRate: Number((base * 100).toFixed(1)), value: future(base), cause: "Moderate growth with valuation gradually normalizing." },
      bear: { annualRate: Number((bear * 100).toFixed(1)), value: future(bear), cause: "Growth slows and the market assigns a lower valuation." },
      behaviorInsight: input.behaviorResponse === "sell" && asset.riskScore > 55 ? "This asset may be more volatile than your stated behavioral comfort suggests." : "Your response does not immediately conflict with the modeled volatility, but real markets can still be emotionally difficult.",
    };
  }
}
