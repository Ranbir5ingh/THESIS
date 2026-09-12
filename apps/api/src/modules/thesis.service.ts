import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { GoogleGenAI } from "@google/genai";
import type { Pool } from "pg";
import { DB } from "../common/db.module";
import { query } from "../common/db";
import { MarketService } from "./market.service";

@Injectable()
export class ThesisService {
  constructor(@Inject(DB) private readonly pool: Pool | null, private readonly market: MarketService) {}
  private requireDb() { if (!this.pool) throw new ServiceUnavailableException("Supabase is not configured. Add DATABASE_URL to the API environment."); return this.pool; }

  async challenge(input: { symbol: string; thesis: string; userId: string; profile?: unknown }) {
    if (!process.env.GEMINI_API_KEY) throw new ServiceUnavailableException("Gemini is not configured. Add GEMINI_API_KEY to the API environment.");
    const analysis = await this.market.analysis(input.symbol, input.userId);
    const profile = analysis.profile ?? input.profile ?? null;
    if (!profile) throw new ServiceUnavailableException("Complete Investor DNA before challenging a thesis.");
    const prompt = `You are THESIS, an educational investment decision coach for first-time investors. Never give buy/sell instructions. Never invent or infer missing financial numbers. Use only the supplied verified market data and the user's profile. Explain finance in plain English. Challenge the user's reasoning, identify assumptions, weigh supporting and contradictory evidence, detect behavioral bias, and give a cautious decision context. Return ONLY valid JSON matching this shape: {"thesisStrength":number,"assumptions":string[],"supportingEvidence":string[],"contradictingEvidence":string[],"biggestAssumption":string,"biases":[{"name":string,"score":number,"reason":string}],"devilAdvocate":string,"decision":"CONSIDER"|"WAIT"|"RETHINK","summary":string}. DATA=${JSON.stringify(analysis)} PROFILE=${JSON.stringify(profile)} USER_THESIS=${JSON.stringify(input.thesis)}`;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let text = "";
    try {
      const response = await ai.models.generateContent({ model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 1800 } });
      text = response.text?.trim() ?? "";
    } catch { throw new ServiceUnavailableException("THESIS could not reach Gemini. Please retry shortly."); }
    let result: any;
    try { result = JSON.parse(text); } catch { throw new ServiceUnavailableException("THESIS received an invalid AI response. Please retry."); }
    if (typeof result.thesisStrength !== "number" || !Array.isArray(result.supportingEvidence) || !Array.isArray(result.contradictingEvidence) || !Array.isArray(result.biases) || !["CONSIDER", "WAIT", "RETHINK"].includes(result.decision)) throw new ServiceUnavailableException("THESIS received an incomplete AI response. Please retry.");
    return result;
  }

  async save(input: any) {
    const pool = this.requireDb();
    const asset = await this.market.getAsset(input.symbol);
    const assetRow = await query<{ id: string }>(pool, `INSERT INTO assets(symbol,exchange,name,sector,asset_type) VALUES($1,$2,$3,$4,$5) ON CONFLICT(symbol) DO UPDATE SET exchange=EXCLUDED.exchange,name=EXCLUDED.name,sector=EXCLUDED.sector,asset_type=EXCLUDED.asset_type RETURNING id`, [asset.symbol, asset.exchange, asset.name, asset.sector, asset.assetType]);
    await query(pool, `INSERT INTO theses(user_id,asset_id,thesis_text,thesis_score,bias_score,decision,analysis_json) VALUES($1,$2,$3,$4,$5,$6,$7)`, [input.userId, assetRow.rows[0].id, input.thesis, input.analysis?.thesisStrength ?? null, input.analysis?.biases?.[0]?.score ?? null, input.analysis?.decision ?? "WAIT", JSON.stringify(input.analysis ?? {})]);
    return { saved: true };
  }

  async list(userId: string) {
    const pool = this.requireDb();
    return (await query(pool, `SELECT t.id,t.thesis_text,t.thesis_score,t.bias_score,t.decision,t.analysis_json,t.created_at,a.symbol,a.name FROM theses t JOIN assets a ON a.id=t.asset_id WHERE t.user_id=$1 ORDER BY t.created_at DESC`, [userId])).rows;
  }
}
