import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Pool } from "pg";
import { DB } from "../common/db.module";
import { query } from "../common/db";
import { MarketService } from "./market.service";

@Injectable()
export class SimulationService {
  constructor(@Inject(DB) private readonly pool: Pool | null, private readonly market: MarketService) {}
  async simulate(i: { symbol: string; amount: number; years: number; behaviorResponse?: string; userId: string }) {
    const amount = Number(i.amount); const years = Number(i.years);
    if (!Number.isFinite(amount) || amount < 100 || !Number.isFinite(years) || ![1, 3, 5, 10].includes(years)) throw new ServiceUnavailableException("Simulation inputs are invalid.");

    const analysis = await this.market.analysis(i.symbol, i.userId);
    const a = analysis.asset;

    // The simulator never invents financial inputs. It needs verified price history
    // because the scenario range is anchored to the asset's observed annualized
    // return and observed volatility. Fundamentals are context, not fabricated
    // substitutes when the provider does not return them.
    if (a.historicalAnnualizedReturn === null || a.volatility === null || a.maxDrawdown === null) {
      throw new ServiceUnavailableException(
        "There is not enough verified historical market data to build this scenario. Try again later or choose an asset with available price history."
      );
    }

    const historicalReturn = Math.max(-0.25, Math.min(0.30, a.historicalAnnualizedReturn / 100));
    const observedVolatility = Math.max(0, Math.min(1.0, a.volatility / 100));
    const spread = Math.max(0.025, Math.min(0.10, observedVolatility * 0.55));
    const base = historicalReturn;
    const bull = Math.max(-0.25, Math.min(0.35, base + spread));
    const bear = Math.max(-0.35, Math.min(0.25, base - spread * 1.25));
    const futureValue = (rate: number) => Math.round(amount * Math.pow(1 + rate, years));
    const drawdown = Math.round(a.maxDrawdown);
    const behavior = i.behaviorResponse;
    const behaviorInsight = behavior === "sell"
      ? `A historical-style ${drawdown}% drawdown would be meaningful for ${a.name}. Decide in advance what evidence would tell you the business thesis changed.`
      : behavior === "buy"
        ? `Adding after a ${drawdown}% fall increases concentration. A lower price is not, by itself, proof that the thesis improved.`
        : behavior === "unsure"
          ? `Uncertainty is useful information. Define what evidence would make you hold, reduce exposure or abandon the thesis before emotions arrive.`
          : `Holding through a ${drawdown}% fall requires a clear distinction between a price move and a change in the business thesis.`;

    const out = {
      asset: { symbol: a.symbol, name: a.name, price: a.price, currency: a.currency, risk: a.riskScore, hype: a.hypeScore, quality: a.qualityScore },
      inputs: { amount, years, historicalAnnualizedReturn: +(a.historicalAnnualizedReturn).toFixed(2), historicalVolatility: +(a.volatility).toFixed(2), historicalPeriodDays: a.historicalPeriodDays, maxDrawdown: drawdown, revenueGrowth: a.revenueGrowth, profitGrowth: a.profitGrowth, pe: a.pe },
      scenarios: {
        bull: { annualRate: +(bull * 100).toFixed(1), value: futureValue(bull), cause: `Observed historical return (${a.historicalAnnualizedReturn.toFixed(1)}% annualized) plus a volatility-derived upside range.` },
        base: { annualRate: +(base * 100).toFixed(1), value: futureValue(base), cause: `Observed historical annualized return over ${a.historicalPeriodDays ?? "the available"} days, used as a mechanical reference rather than a forecast.` },
        bear: { annualRate: +(bear * 100).toFixed(1), value: futureValue(bear), cause: `Observed historical return reduced by a volatility-derived downside range; this is not a predicted loss.` },
      },
      stress: { drawdown, question: `If ${a.name} fell ${drawdown}% after you invested, what evidence would make you change your mind?`, response: behavior ?? null, insight: behaviorInsight },
      interpretation: `These scenarios use only verified provider data: the available historical annualized return, observed volatility and historical maximum drawdown. ${a.revenueGrowth !== null || a.profitGrowth !== null || a.pe !== null ? "Available fundamentals are shown as context, but missing fundamentals are never replaced with invented values." : "Fundamental fields were not used because the provider did not return them."}`,
      methodology: { source: "Yahoo Finance historical price series", periodDays: a.historicalPeriodDays, historicalAnnualizedReturn: a.historicalAnnualizedReturn, volatility: a.volatility, maxDrawdown: a.maxDrawdown },
      disclaimer: "Educational scenario only. It is not a price prediction, guaranteed return, or financial advice. Past performance does not guarantee future results.",
    };

    if (this.pool) {
      const assetRow = await query<{ id: string }>(this.pool, `INSERT INTO assets(symbol,exchange,name,sector,asset_type) VALUES($1,$2,$3,$4,$5) ON CONFLICT(symbol) DO UPDATE SET exchange=EXCLUDED.exchange,name=EXCLUDED.name,sector=EXCLUDED.sector,asset_type=EXCLUDED.asset_type RETURNING id`, [a.symbol, a.exchange, a.name, a.sector, a.assetType]);
      await query(this.pool, `INSERT INTO simulations(user_id,asset_id,investment_amount,horizon_years,bull_value,base_value,bear_value,behavior_response) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [i.userId, assetRow.rows[0].id, amount, years, out.scenarios.bull.value, out.scenarios.base.value, out.scenarios.bear.value, behavior ?? null]);
    }
    return out;
  }
}
