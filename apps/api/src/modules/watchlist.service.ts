import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { DB } from "../common/db.module";
import { query } from "../common/db";
import { MarketService } from "./market.service";

@Injectable()
export class WatchlistService {
  constructor(@Inject(DB) private readonly pool: Pool | null, private readonly market: MarketService) {}
  async list() {
    if (!this.pool) return [await this.market.getAsset("RELIANCE"), await this.market.getAsset("TCS"), await this.market.getAsset("NVIDIA")];
    const result = await query(this.pool, `SELECT a.* FROM watchlists w JOIN assets a ON a.id=w.asset_id WHERE w.email=$1 ORDER BY w.created_at DESC`, ["demo@thesis.local"]);
    return result.rows.length ? result.rows : [await this.market.getAsset("RELIANCE")];
  }
  async toggle(symbol: string) {
    if (!this.pool) return { saved: true, symbol };
    const asset = await this.market.getAsset(symbol);
    const row = await query<{ id: string }>(this.pool, `INSERT INTO assets(symbol,exchange,name,sector,asset_type) VALUES($1,$2,$3,$4,'stock') ON CONFLICT(symbol) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [asset.symbol, asset.exchange, asset.name, asset.sector]);
    await query(this.pool, `INSERT INTO watchlists(email,asset_id) VALUES($1,$2) ON CONFLICT(email,asset_id) DO NOTHING`, ["demo@thesis.local", row.rows[0].id]);
    return { saved: true, symbol: asset.symbol };
  }
}
