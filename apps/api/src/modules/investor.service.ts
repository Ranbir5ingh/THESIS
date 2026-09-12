import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { DB } from "../common/db.module";
import { query } from "../common/db";

@Injectable()
export class InvestorService {
  constructor(@Inject(DB) private readonly pool: Pool | null) {}

  async get(email = process.env.THESIS_DEMO_EMAIL ?? "demo@thesis.local") {
    if (!this.pool) return this.demo();
    const result = await query(this.pool, `SELECT * FROM investor_profiles WHERE email=$1 LIMIT 1`, [email]);
    return result.rows[0] ?? this.demo();
  }

  async save(input: Record<string, string>) {
    if (!this.pool) return { ...this.demo(), ...input };
    await query(this.pool, `INSERT INTO investor_profiles(email, goal, risk_tolerance, time_horizon, knowledge_level, growth_preference, income_preference) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(email) DO UPDATE SET goal=EXCLUDED.goal,risk_tolerance=EXCLUDED.risk_tolerance,time_horizon=EXCLUDED.time_horizon,knowledge_level=EXCLUDED.knowledge_level,growth_preference=EXCLUDED.growth_preference,income_preference=EXCLUDED.income_preference`, [input.email ?? process.env.THESIS_DEMO_EMAIL ?? "demo@thesis.local", input.goal, input.riskTolerance, input.timeHorizon, input.knowledgeLevel, input.growthPreference, input.incomePreference]);
    return this.get(input.email);
  }

  private demo() { return { email: "demo@thesis.local", goal: "long-term wealth", riskTolerance: "moderate", timeHorizon: "5–10 years", knowledgeLevel: "basics", growthPreference: "balanced", incomePreference: "growth" }; }
}
