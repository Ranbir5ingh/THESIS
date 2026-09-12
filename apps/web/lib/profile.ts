export type InvestorProfile = {
  userId: string;
  goal: string;
  riskTolerance: string;
  timeHorizon: string;
  knowledgeLevel: string;
  growthPreference: string;
  incomePreference: string;
};

export function dnaScores(p: InvestorProfile) {
  const horizon: Record<string, number> = { "<1 year": 18, "1-3": 38, "3-5": 60, "5-10": 82, "10+": 96 };
  const risk: Record<string, number> = { sell: 20, "probably-sell": 35, wait: 55, buy: 78, "aggressive-buy": 94 };
  const growth = p.goal === "aggressive" || p.growthPreference === "growth" ? 88 : p.goal === "income" ? 52 : 72;
  const knowledge: Record<string, number> = { new: 22, basics: 42, metrics: 70, active: 92 };
  return {
    horizon: horizon[p.timeHorizon] ?? 60,
    risk: risk[p.riskTolerance] ?? 55,
    growth,
    knowledge: knowledge[p.knowledgeLevel] ?? 42,
  };
}

export function dnaTitle(p: InvestorProfile) {
  const s = dnaScores(p);
  if (s.risk >= 80 && s.growth >= 80) return "Aggressive growth";
  if (s.risk <= 35) return "Capital conscious";
  if (s.growth >= 80) return "Growth focused";
  return "Balanced growth";
}
