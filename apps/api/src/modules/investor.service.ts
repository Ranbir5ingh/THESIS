import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { Pool } from "pg";
import { DB } from "../common/db.module";
import { query } from "../common/db";

@Injectable()
export class InvestorService {
  constructor(@Inject(DB) private readonly pool: Pool | null) {}
  private requireDb() { if (!this.pool) throw new ServiceUnavailableException("Supabase is not configured. Add DATABASE_URL to the API environment."); return this.pool; }
  async get(userId: string) {
    const pool = this.requireDb();
    const result = await query<any>(pool, `SELECT user_id AS "userId", goal, risk_tolerance AS "riskTolerance", time_horizon AS "timeHorizon", knowledge_level AS "knowledgeLevel", growth_preference AS "growthPreference", income_preference AS "incomePreference", created_at AS "createdAt", updated_at AS "updatedAt" FROM investor_profiles WHERE user_id=$1 LIMIT 1`, [userId]);
    if (!result.rows[0]) throw new NotFoundException("Investor DNA has not been completed yet.");
    return result.rows[0];
  }
  async save(input: Record<string, string>) {
    const pool = this.requireDb();
    const values = [input.userId, input.goal, input.riskTolerance, input.timeHorizon, input.knowledgeLevel, input.growthPreference, input.incomePreference];
    await query(pool, `INSERT INTO investor_profiles(user_id,goal,risk_tolerance,time_horizon,knowledge_level,growth_preference,income_preference) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id) DO UPDATE SET goal=EXCLUDED.goal,risk_tolerance=EXCLUDED.risk_tolerance,time_horizon=EXCLUDED.time_horizon,knowledge_level=EXCLUDED.knowledge_level,growth_preference=EXCLUDED.growth_preference,income_preference=EXCLUDED.income_preference,updated_at=now()`, values);
    return this.get(input.userId);
  }
}
