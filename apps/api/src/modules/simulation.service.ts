import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { DB } from "../common/db.module";
import { query } from "../common/db";
import { MarketService } from "./market.service";

@Injectable()
export class SimulationService {
  constructor(@Inject(DB) private readonly pool: Pool | null, private readonly market: MarketService) {}

  async simulate(i:{symbol:string;amount:number;years:number;behaviorResponse?:string}) {
    const analysis = await this.market.analysis(i.symbol);
    const a = analysis.asset;
    const amount = Math.max(100, Number(i.amount)||10000);
    const years = [1,3,5,10].includes(Number(i.years)) ? Number(i.years) : 5;

    // Transparent scenario model: growth + earnings quality + valuation + risk.
    // This is deliberately a scenario range, not a forecast.
    const growth = Math.max(-0.08, Math.min(0.22, (a.revenueGrowth*0.55 + a.profitGrowth*0.45) / 100));
    const valuationDrag = a.pe > 35 ? Math.min(0.08,(a.pe-35)/250) : a.pe > 25 ? (a.pe-25)/500 : -Math.min(0.025,(25-a.pe)/800);
    const riskDrag = a.riskScore/100*0.025;
    const base = Math.max(-0.10, Math.min(0.18, growth - valuationDrag - riskDrag));
    const bull = Math.max(base+0.025, Math.min(0.25, base + 0.055 + Math.max(0,a.qualityScore-70)/1000));
    const bear = Math.max(-0.30, Math.min(base-0.025, base - 0.075 - a.riskScore/2000));
    const fv=(r:number)=>Math.round(amount*Math.pow(1+r,years));
    const drawdown=years>=5?Math.min(50,Math.max(10,Math.round(a.riskScore*.55))):Math.min(45,Math.max(8,Math.round(a.riskScore*.45)));
    const behavior=i.behaviorResponse;
    const behaviorInsight = behavior === "sell"
      ? `A ${drawdown}% stress event would be meaningful for ${a.name}. Selling during a fall can lock in a loss; the important question is whether the business thesis changed or only the price did.`
      : behavior === "buy"
      ? `Adding after a ${drawdown}% fall increases exposure to ${a.name}. That can help if the thesis is intact, but it also increases concentration and downside risk.`
      : behavior === "unsure"
      ? `Uncertainty is itself useful information. Before owning ${a.name}, define what evidence would make you hold, reduce, or abandon the thesis.`
      : `Holding through a ${drawdown}% fall requires conviction that the underlying ${a.name} thesis remains intact. A price fall alone does not answer that question.`;

    const out={
      asset:{symbol:a.symbol,name:a.name,price:a.price,currency:a.currency,risk:a.riskScore,hype:a.hypeScore,quality:a.qualityScore},
      inputs:{amount,years,revenueGrowth:a.revenueGrowth,profitGrowth:a.profitGrowth,pe:a.pe,risk:a.riskScore},
      scenarios:{
        bull:{annualRate:+(bull*100).toFixed(1),value:fv(bull),cause:`Growth accelerates, earnings remain strong and valuation stays supportive.`},
        base:{annualRate:+(base*100).toFixed(1),value:fv(base),cause:`Growth broadly follows the business evidence while valuation normalizes.`},
        bear:{annualRate:+(bear*100).toFixed(1),value:fv(bear),cause:`Growth disappoints and the market applies more pressure to valuation.`}
      },
      stress:{drawdown,question:`If ${a.name} fell ${drawdown}% after you invested, what evidence would make you change your mind?`,response:behavior??"hold",insight:behaviorInsight},
      interpretation:`For ${a.name}, the key variables are earnings growth, valuation and the ability to tolerate drawdowns. The scenarios are mechanical illustrations, not expected returns.`,
      disclaimer:"Educational scenario only. It is not a price prediction, guaranteed return, or financial advice."
    };
    if(this.pool){
      const ar=await query<{id:string}>(this.pool,`INSERT INTO assets(symbol,exchange,name,sector,asset_type) VALUES($1,$2,$3,$4,'stock') ON CONFLICT(symbol) DO UPDATE SET name=EXCLUDED.name RETURNING id`,[a.symbol,a.exchange,a.name,a.sector]);
      await query(this.pool,`INSERT INTO simulations(email,asset_id,investment_amount,horizon_years,bull_value,base_value,bear_value,behavior_response) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,["demo@thesis.local",ar.rows[0].id,amount,years,out.scenarios.bull.value,out.scenarios.base.value,out.scenarios.bear.value,behavior??null]);
    }
    return out;
  }
}
