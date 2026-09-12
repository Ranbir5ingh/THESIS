import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Pool } from "pg";
import { DB } from "../common/db.module";
import { query } from "../common/db";
import { MarketService } from "./market.service";

@Injectable()
export class WatchlistService {
  constructor(@Inject(DB) private readonly pool: Pool | null, private readonly market: MarketService) {}
  private requireDb() { if (!this.pool) throw new ServiceUnavailableException("Supabase is not configured. Add DATABASE_URL to the API environment."); return this.pool; }
  async list(userId: string) {
    const pool = this.requireDb();
    const rows = await query<any>(pool, `SELECT a.symbol FROM watchlists w JOIN assets a ON a.id=w.asset_id WHERE w.user_id=$1 ORDER BY w.created_at DESC`, [userId]);
    return Promise.all(rows.rows.map((x: any) => this.market.analysis(x.symbol, userId)));
  }
  async toggle(symbol: string, userId: string) {
    const pool = this.requireDb();
    const asset = await this.market.getAsset(symbol);
    const row = await query<{ id: string }>(pool, `INSERT INTO assets(symbol,exchange,name,sector,asset_type) VALUES($1,$2,$3,$4,$5) ON CONFLICT(symbol) DO UPDATE SET exchange=EXCLUDED.exchange,name=EXCLUDED.name,sector=EXCLUDED.sector,asset_type=EXCLUDED.asset_type RETURNING id`, [asset.symbol, asset.exchange, asset.name, asset.sector, asset.assetType]);
    const existing = await query<{ id: string }>(pool, `SELECT id FROM watchlists WHERE user_id=$1 AND asset_id=$2`, [userId, row.rows[0].id]);
    if (existing.rows.length) { await query(pool, `DELETE FROM watchlists WHERE id=$1`, [existing.rows[0].id]); return { saved: false, symbol: asset.symbol }; }
    await query(pool, `INSERT INTO watchlists(user_id,asset_id) VALUES($1,$2)`, [userId, row.rows[0].id]);
    return { saved: true, symbol: asset.symbol };
  }
}
