import { Inject, Injectable } from "@nestjs/common";
import { GoogleGenAI } from "@google/genai";
import type { Pool } from "pg";
import { DB } from "../common/db.module";
import { query } from "../common/db";
import { MarketService } from "./market.service";

@Injectable()
export class ThesisService {
  constructor(@Inject(DB) private readonly pool: Pool | null, private readonly market: MarketService) {}

  async challenge(input: { symbol: string; thesis: string; profile?: Record<string, unknown> }) {
    const analysis = await this.market.analysis(input.symbol);
    const prompt = `You are THESIS, an educational investment decision coach. Never invent quantitative facts. Use only the supplied data. Analyze the user's thesis, identify assumptions, supporting evidence, contradictory evidence, behavioral bias signals, and a devil's advocate argument. Do not tell the user to buy or sell. Return concise JSON with keys thesisStrength (number 0-100), assumptions (string[]), supportingEvidence (string[]), contradictingEvidence (string[]), biggestAssumption (string), biases (array of {name:string,score:number,reason:string}), devilAdvocate (string), decision (CONSIDER|WAIT|RETHINK), summary (string).\n\nAsset data: ${JSON.stringify(analysis)}\nUser profile: ${JSON.stringify(input.profile ?? {})}\nUser thesis: ${input.thesis}`;
    const aiText = await this.gemini(prompt);
    if (aiText) {
      try { return JSON.parse(aiText); } catch { /* deterministic fallback below */ }
    }
    return this.fallback(input.thesis, analysis);
  }

  async save(input: { email?: string; symbol: string; thesis: string; analysis: any }) {
    if (this.pool) {
      const asset = await query<{ id: string }>(this.pool, `INSERT INTO assets(symbol, exchange, name, sector, asset_type) VALUES($1,$2,$3,$4,$5) ON CONFLICT(symbol) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [input.symbol, "NSE", input.symbol, "Unknown", "stock"]);
      await query(this.pool, `INSERT INTO theses(email, asset_id, thesis_text, thesis_score, bias_score, decision, analysis_json) VALUES($1,$2,$3,$4,$5,$6,$7)`, [input.email ?? "demo@thesis.local", asset.rows[0].id, input.thesis, input.analysis.thesisStrength ?? 0, input.analysis.biases?.[0]?.score ?? 0, input.analysis.decision ?? "WAIT", JSON.stringify(input.analysis)]);
    }
    return { saved: true, thesis: input.thesis, symbol: input.symbol };
  }

  async list(email = "demo@thesis.local") {
    if (!this.pool) return [];
    const result = await query(this.pool, `SELECT t.id,t.thesis_text,t.thesis_score,t.bias_score,t.decision,t.created_at,a.symbol,a.name FROM theses t JOIN assets a ON a.id=t.asset_id WHERE t.email=$1 ORDER BY t.created_at DESC`, [email]);
    return result.rows;
  }

  private async gemini(prompt: string): Promise<string | null> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({ model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json" } });
      return response.text?.trim() || null;
    } catch (error) {
      console.error("Gemini request failed:", error);
      return null;
    }
  }

  private fallback(thesis: string, analysis: any) {
    const hype = analysis.hype.score;
    const risk = analysis.risk.score;
    const strength = Math.max(48, Math.min(92, 78 - Math.round(risk * 0.18) - Math.round(Math.max(0, hype - 55) * 0.18) + (thesis.length > 55 ? 7 : 0)));
    const bias = hype > 70 ? 72 : thesis.toLowerCase().includes("everyone") ? 88 : 28;
    const decision = risk > 70 || hype > 82 ? "WAIT" : strength >= 70 ? "CONSIDER" : "RETHINK";
    return {
      thesisStrength: strength,
      assumptions: ["The growth drivers in the thesis continue for the chosen horizon.", "Current valuation does not fully price in the expected outcome."],
      supportingEvidence: ["The supplied fundamentals show positive growth.", "The business quality score is comparatively strong."],
      contradictingEvidence: [risk > 50 ? "Volatility can create meaningful short-term drawdowns." : "Valuation still matters even when business quality is high.", hype > 60 ? "Attention is elevated relative to a calmer baseline." : "The thesis still depends on future execution."],
      biggestAssumption: "Future earnings growth will be strong enough to justify the price paid today.",
      biases: [{ name: hype > 70 ? "FOMO / Herding" : "Confirmation bias", score: bias, reason: hype > 70 ? "High attention can make popularity feel like evidence." : "A strong thesis can selectively emphasize confirming evidence." }],
      devilAdvocate: "If the growth story slows while valuation remains elevated, the market can re-rate the asset even if the company remains fundamentally healthy.",
      decision,
      summary: "Your idea has a coherent story, but the decision depends on whether the expected growth is already reflected in today's valuation."
    };
  }
}
