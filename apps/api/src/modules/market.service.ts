import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Pool } from "pg";
import { DB } from "../common/db.module";
import { query } from "../common/db";

export type InvestorProfile = {
  userId: string;
  goal: string;
  riskTolerance: string;
  timeHorizon: string;
  knowledgeLevel: string;
  growthPreference: string;
  incomePreference: string;
};

type Asset = {
  symbol: string;
  exchange: string;
  name: string;
  assetType: string;
  sector: string;
  price: number;
  changePercent: number;
  currency: string;
  pe: number | null;
  marketCap: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  debtToEquity: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  beta: number | null;
  historicalAnnualizedReturn: number | null;
  historicalPeriodDays: number | null;
  qualityScore: number | null;
  riskScore: number | null;
  hypeScore: number | null;
  personalFit: number | null;
  dataCompleteness: number;
  dataWarnings: string[];
  dataProvider: "Yahoo Finance";
  dataFreshness: "live" | "eod" | "historical";
};

type CacheEntry = { expires: number; value: unknown };
type PricePoint = { date: string; price: number; volume: number };
type NewsItem = { title: string; source: string; url: string; time: string; sentiment: number | null; summary?: string };

type ProviderRef = { symbol: string; exchange?: string };

@Injectable()
export class MarketService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(@Inject(DB) private readonly pool: Pool | null) {}

  private cacheGet<T>(key: string): T | null {
    const hit = this.cache.get(key);
    if (!hit || hit.expires < Date.now()) {
      if (hit) this.cache.delete(key);
      return null;
    }
    return hit.value as T;
  }

  private cacheSet(key: string, value: unknown, ttlMs: number) {
    this.cache.set(key, { expires: Date.now() + ttlMs, value });
  }

  /**
   * Market-provider cache.
   *
   * Yahoo Finance is the primary provider and does not require an API key.
   * Responses are cached in memory and, when Supabase is configured, in
   * Postgres so a restart does not immediately repeat the same upstream call.
   */
  private async yahooRequest<T = any>(path: string, params: Record<string, string>, ttlMs: number): Promise<T> {
    const key = `yahoo:${path}:${JSON.stringify(params)}`;
    const memory = this.cacheGet<T>(key);
    if (memory !== null) return memory;

    const running = this.inflight.get(key) as Promise<T> | undefined;
    if (running) return running;

    const request = (async () => {
      if (this.pool) {
        try {
          const stored = await query<{ payload: T; expires_at: string }>(
            this.pool,
            `SELECT payload, expires_at FROM market_data_cache WHERE cache_key=$1 LIMIT 1`,
            [key],
          );
          const row = stored.rows[0];
          if (row?.payload) {
            const expires = Date.parse(row.expires_at);
            if (Number.isFinite(expires) && expires > Date.now()) {
              this.cacheSet(key, row.payload, Math.min(ttlMs, 10 * 60_000));
              return row.payload;
            }
          }
        } catch {
          // Persistent caching is an optimization, never a correctness dependency.
        }
      }

      const url = new URL(`https://query1.finance.yahoo.com${path}`);
      for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);

      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(12_000),
          headers: {
            accept: "application/json",
            "user-agent": "THESIS-Educational-Investment-Coach/1.0",
          },
        });
        const json = await response.json().catch(() => ({}));

        if (!response.ok || json?.finance?.error || json?.chart?.error) {
          const message = String(
            json?.finance?.error?.description ||
            json?.chart?.error?.description ||
            `Yahoo Finance HTTP ${response.status}`,
          );

          // If the provider throttles us, use the last verified response if one exists.
          if (response.status === 429 || /too many|rate|crumb|unauthorized/i.test(message)) {
            if (this.pool) {
              try {
                const stale = await query<{ payload: T }>(
                  this.pool,
                  `SELECT payload FROM market_data_cache WHERE cache_key=$1 LIMIT 1`,
                  [key],
                );
                if (stale.rows[0]?.payload) {
                  this.cacheSet(key, stale.rows[0].payload, 60_000);
                  return stale.rows[0].payload;
                }
              } catch {
                // Continue to a clear provider error.
              }
            }
            throw new ServiceUnavailableException(
              "Yahoo Finance is temporarily rate-limiting this request and THESIS has no cached copy yet. Please retry shortly.",
            );
          }

          throw new ServiceUnavailableException(`Yahoo Finance could not return this data: ${message}`);
        }

        this.cacheSet(key, json, ttlMs);

        if (this.pool) {
          try {
            await query(
              this.pool,
              `INSERT INTO market_data_cache(cache_key,payload,expires_at)
               VALUES($1,$2::jsonb,now()+($3::bigint * interval '1 millisecond'))
               ON CONFLICT(cache_key) DO UPDATE SET payload=EXCLUDED.payload,expires_at=EXCLUDED.expires_at`,
              [key, JSON.stringify(json), ttlMs],
            );
          } catch {
            // Cache writes must never break a successful market-data response.
          }
        }

        return json as T;
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        throw new ServiceUnavailableException(
          "Yahoo Finance could not be reached. The provider is temporarily unavailable; please retry shortly.",
        );
      }
    })();

    this.inflight.set(key, request);
    try {
      return await request;
    } finally {
      this.inflight.delete(key);
    }
  }

  private num(value: unknown): number | null {
    if (value === null || value === undefined || value === "" || value === "None" || value === "N/A" || value === "-") return null;
    const n = Number(String(value).replace(/[%,$]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  private percent(value: unknown) {
    return this.num(value);
  }

  private currency(symbol: string, exchange: string, provider?: string) {
    const s = symbol.toUpperCase();
    const e = exchange.toUpperCase();
    if (provider && /^[A-Z]{3}$/.test(provider)) return provider;
    if (s.endsWith(".BSE") || s.endsWith(".NSE") || e.includes("BSE") || e.includes("NSE") || e.includes("INDIA") || e.includes("BOMBAY")) return "INR";
    return "USD";
  }

  private providerRef(symbol: string): ProviderRef {
    const s = decodeURIComponent(symbol).trim().toUpperCase();
    if (s.endsWith(".BSE") || s.endsWith(".BO")) return { symbol: s.replace(/\.(BSE|BO)$/, ""), exchange: "BSE" };
    if (s.endsWith(".NSE") || s.endsWith(".NS")) return { symbol: s.replace(/\.(NSE|NS)$/, ""), exchange: "NSE" };
    return { symbol: s };
  }

  private yahooSymbol(symbol: string) {
    const ref = this.providerRef(symbol);
    if (ref.exchange === "BSE") return `${ref.symbol}.BO`;
    if (ref.exchange === "NSE") return `${ref.symbol}.NS`;
    return ref.symbol;
  }

  private appSymbol(providerSymbol: string, exchange?: string) {
    const raw = String(providerSymbol || "").toUpperCase();
    if (raw.endsWith(".BO")) return `${raw.slice(0, -3)}.BSE`;
    if (raw.endsWith(".NS")) return `${raw.slice(0, -3)}.NSE`;

    const ex = String(exchange || "").toUpperCase();
    if (ex.includes("BOMBAY") || ex === "BSE" || ex === "XBOM") return `${raw}.BSE`;
    if (ex.includes("NATIONAL STOCK") || ex === "NSE" || ex === "XNSE" || ex === "NSI") return `${raw}.NSE`;
    return raw;
  }

  private parseYahooChart(remote: any): { series: PricePoint[]; meta: any } {
    const result = remote?.chart?.result?.[0];
    if (!result) return { series: [], meta: {} };

    const timestamps: number[] = Array.isArray(result.timestamp) ? result.timestamp : [];
    const quote = result?.indicators?.quote?.[0] || {};
    const closes = Array.isArray(quote.close) ? quote.close : [];
    const volumes = Array.isArray(quote.volume) ? quote.volume : [];

    const series = timestamps.map((ts, i) => ({
      date: new Date(Number(ts) * 1000).toISOString().slice(0, 10),
      price: Number(closes[i]),
      volume: Number(volumes[i] || 0),
    })).filter((x: PricePoint) => x.date && Number.isFinite(x.price) && x.price > 0);

    return { series, meta: result.meta || {} };
  }

  private async yahooChart(symbol: string) {
    const yahoo = this.yahooSymbol(symbol);
    const remote = await this.yahooRequest<any>(
      `/v8/finance/chart/${encodeURIComponent(yahoo)}`,
      {
        range: "2y",
        interval: "1d",
        events: "div,splits",
        includeAdjustedClose: "true",
      },
      12 * 60 * 60_000,
    );
    return this.parseYahooChart(remote);
  }

  private async yahooFundamentals(symbol: string): Promise<any | null> {
    // Yahoo's quoteSummary endpoint is best-effort. It may be unavailable for
    // some instruments/regions; THESIS leaves those fundamentals blank rather
    // than inventing them.
    const yahoo = this.yahooSymbol(symbol);
    try {
      return await this.yahooRequest<any>(
        `/v10/finance/quoteSummary/${encodeURIComponent(yahoo)}`,
        {
          modules: "price,summaryDetail,defaultKeyStatistics,financialData,assetProfile",
        },
        24 * 60 * 60_000,
      );
    } catch {
      return null;
    }
  }

  private async priceSeries(symbol: string): Promise<PricePoint[]> {
    const result = await this.yahooChart(symbol);
    return result.series;
  }

  private historyMetrics(series: PricePoint[]) {
    if (series.length < 8) {
      return { volatility: null, maxDrawdown: null, abnormalVolume: null, priceAcceleration: null, annualizedReturn: null, periodDays: null };
    }
    const prices = series.map(x => x.price).filter(Number.isFinite);
    const firstDate = Date.parse(series[0].date);
    const lastDate = Date.parse(series[series.length - 1].date);
    const periodDays = Number.isFinite(firstDate) && Number.isFinite(lastDate)
      ? Math.max(1, Math.round((lastDate - firstDate) / 86_400_000))
      : null;
    const annualizedReturn = periodDays && prices[0] > 0 && prices[prices.length - 1] > 0
      ? (Math.pow(prices[prices.length - 1] / prices[0], 365 / periodDays) - 1) * 100
      : null;
    const returns = prices.slice(1).map((p, i) => p / prices[i] - 1).filter(Number.isFinite);
    const mean = returns.length ? returns.reduce((s, x) => s + x, 0) / returns.length : 0;
    const variance = returns.length ? returns.reduce((s, x) => s + (x - mean) ** 2, 0) / returns.length : 0;
    const volatility = returns.length ? Math.min(100, Math.sqrt(variance) * Math.sqrt(252) * 100) : null;
    let peak = prices[0];
    let maxDrawdown = 0;
    for (const p of prices) {
      peak = Math.max(peak, p);
      if (peak > 0) maxDrawdown = Math.max(maxDrawdown, ((peak - p) / peak) * 100);
    }
    const volumes = series.map(x => x.volume).filter(x => x > 0);
    const recent = volumes.slice(-10);
    const baseline = volumes.slice(0, -10);
    const avg = (xs: number[]) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
    const abnormalVolume = baseline.length && avg(baseline) > 0
      ? Math.min(100, Math.max(0, (avg(recent) / avg(baseline) - 1) * 100))
      : null;
    const window = Math.min(20, prices.length - 1);
    const old = prices[prices.length - 1 - window];
    const recentReturn = old > 0 ? (prices[prices.length - 1] / old - 1) * 100 : 0;
    const priceAcceleration = Math.min(100, Math.max(0, recentReturn * 2));
    return { volatility, maxDrawdown, abnormalVolume, priceAcceleration, annualizedReturn, periodDays };
  }

  private weighted(values: Array<[number | null, number]>) {
    const available = values.filter(([v]) => v !== null && Number.isFinite(v));
    if (!available.length) return null;
    const weight = available.reduce((s, [, w]) => s + w, 0);
    return Math.round(available.reduce((s, [v, w]) => s + Number(v) * w, 0) / weight);
  }

  private risk(a: Asset) {
    const debtRisk = a.debtToEquity === null ? null : Math.min(100, a.debtToEquity >= 3 ? 100 : Math.max(0, a.debtToEquity * 22));
    const earningsInstability = a.profitGrowth === null ? null : Math.min(100, Math.abs(a.profitGrowth - 10) * 3);
    const valuation = a.pe === null ? null : Math.min(100, Math.max(0, (a.pe - 18) * 2.2));
    const betaRisk = a.beta === null ? null : Math.min(100, Math.max(0, (a.beta - 0.5) * 55));
    return this.weighted([[a.volatility, .30], [a.maxDrawdown, .20], [debtRisk, .15], [earningsInstability, .15], [valuation, .10], [betaRisk, .10]]);
  }

  private quality(a: Asset) {
    const growth = a.revenueGrowth === null ? null : Math.max(0, Math.min(100, 50 + a.revenueGrowth * 2));
    const profit = a.profitGrowth === null ? null : Math.max(0, Math.min(100, 50 + a.profitGrowth * 2));
    const leverage = a.debtToEquity === null ? null : Math.max(0, 100 - Math.min(100, a.debtToEquity * 18));
    const valuation = a.pe === null ? null : Math.max(0, 100 - Math.min(100, Math.max(0, a.pe - 12) * 1.5));
    return this.weighted([[growth, .30], [profit, .35], [leverage, .20], [valuation, .15]]);
  }

  private hype(a: Asset, news: NewsItem[], history: ReturnType<MarketService["historyMetrics"]>) {
    const sentimentValues = news.map(x => x.sentiment).filter((x): x is number => x !== null && Number.isFinite(x));
    const sentimentIntensity = sentimentValues.length ? Math.min(100, Math.abs(sentimentValues.reduce((s, x) => s + x, 0) / sentimentValues.length) * 100) : null;
    const newsVolume = news.length ? Math.min(100, news.length * 12.5) : null;
    const divergence = a.revenueGrowth === null || a.pe === null || history.priceAcceleration === null
      ? null
      : Math.max(0, Math.min(100, history.priceAcceleration - Math.max(0, a.revenueGrowth * 1.2) + Math.max(0, a.pe - 25) * .6));
    return this.weighted([[history.priceAcceleration, .30], [newsVolume, .20], [sentimentIntensity, .20], [history.abnormalVolume, .15], [divergence, .15]]);
  }

  private fit(a: Asset, p: InvestorProfile) {
    if (a.riskScore === null || a.volatility === null) return null;
    const target = p.riskTolerance === "aggressive-buy" || p.riskTolerance === "buy" ? 72 : p.riskTolerance === "sell" || p.riskTolerance === "probably-sell" ? 28 : 50;
    const riskCompat = Math.max(0, 100 - Math.abs(a.riskScore - target) * 1.5);
    const longHorizon = ["5-10", "10+"].includes(p.timeHorizon);
    const horizonCompat = longHorizon ? (a.volatility > 60 ? 72 : 92) : (a.volatility > 60 ? 35 : 75);
    const growthWant = p.goal === "aggressive" || p.growthPreference === "growth";
    const growthCompat = a.revenueGrowth === null ? null : growthWant
      ? Math.min(100, 50 + Math.max(0, a.revenueGrowth) * 1.4)
      : Math.max(0, 90 - Math.max(0, a.revenueGrowth - 15) * 1.2);
    const incomeCompat = a.debtToEquity === null ? null : p.incomePreference === "income" ? (a.debtToEquity < 2 ? 75 : 45) : 80;
    const hypePenalty = a.hypeScore === null ? null : Math.max(0, a.hypeScore - 65) * .35;
    return this.weighted([[riskCompat, .40], [horizonCompat, .25], [growthCompat, .18], [incomeCompat, .10], [hypePenalty === null ? null : 100 - hypePenalty, .07]]);
  }

  private flattenNumbers(value: unknown, path = "", out: Record<string, number> = {}) {
    if (!value || typeof value !== "object") return out;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const next = path ? `${path}.${normalized}` : normalized;
      const numeric = this.num(child);
      if (numeric !== null) out[next] = numeric;
      if (child && typeof child === "object") this.flattenNumbers(child, next, out);
    }
    return out;
  }

  private pickStat(flat: Record<string, number>, keys: string[]) {
    for (const key of keys) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const exact = Object.entries(flat).find(([path]) => path.split(".").pop() === normalized);
      if (exact) return exact[1];
    }
    return null;
  }

  private async newsFeed(symbol: string, companyName?: string): Promise<NewsItem[]> {
    const q = companyName ? `${companyName} stock shares` : `${decodeURIComponent(symbol)} stock shares`;
    const key = `google-news:${q.toLowerCase()}`;
    const cached = this.cacheGet<NewsItem[]>(key);
    if (cached) return cached;
    try {
      const url = new URL("https://news.google.com/rss/search");
      url.searchParams.set("q", q);
      url.searchParams.set("hl", "en-IN");
      url.searchParams.set("gl", "IN");
      url.searchParams.set("ceid", "IN:en");
      const response = await fetch(url, { signal: AbortSignal.timeout(8_000), headers: { accept: "application/rss+xml, application/xml, text/xml" } });
      if (!response.ok) return [];
      const xml = await response.text();
      const clean = (v: string) => v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
      const extract = (item: string, tag: string) => {
        const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
        return match ? clean(match[1]) : "";
      };
      const result = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
        .slice(0, 8)
        .map(m => ({
          title: extract(m[1], "title"),
          source: extract(m[1], "source") || "Google News",
          url: extract(m[1], "link"),
          time: extract(m[1], "pubDate"),
          sentiment: null,
        }))
        .filter(x => x.title && x.url);
      this.cacheSet(key, result, 10 * 60_000);
      return result;
    } catch {
      return [];
    }
  }

  async search(q = "") {
    const term = q.trim();
    if (term.length < 2) return [];

    const remote = await this.yahooRequest<any>(
      "/v1/finance/search",
      {
        q: term,
        quotesCount: "20",
        newsCount: "0",
        enableFuzzyQuery: "true",
      },
      24 * 60 * 60_000,
    );

    const rows = Array.isArray(remote?.quotes) ? remote.quotes : [];
    return rows
      .filter((x: any) => x.symbol && x.quoteType !== "CURRENCY")
      .map((x: any) => {
        const providerSymbol = String(x.symbol);
        const exchange = String(x.exchange || x.fullExchangeName || "");
        return {
          symbol: this.appSymbol(providerSymbol, exchange),
          name: String(x.longname || x.shortname || providerSymbol),
          exchange: exchange || "Global",
          sector: String(x.sector || "Equity"),
          currency: String(x.currency || this.currency(providerSymbol, exchange)),
          matchScore: null,
          providerSymbol,
          micCode: String(x.exchange || ""),
        };
      })
      .slice(0, 12);
  }

  async getProfile(userId: string): Promise<InvestorProfile | null> {
    if (!this.pool) return null;
    const result = await query<any>(
      this.pool,
      `SELECT user_id AS "userId", goal, risk_tolerance AS "riskTolerance", time_horizon AS "timeHorizon", knowledge_level AS "knowledgeLevel", growth_preference AS "growthPreference", income_preference AS "incomePreference"
       FROM investor_profiles WHERE user_id=$1 LIMIT 1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async getAsset(symbol: string): Promise<Asset> {
    const requested = decodeURIComponent(symbol).trim().toUpperCase();

    // One historical Yahoo Finance chart request is the core market-data call.
    // The chart contains the verified daily closes/volume plus instrument metadata.
    const chartResult = await this.yahooChart(requested);
    const history = chartResult.series;
    const meta = chartResult.meta || {};

    if (!history.length) {
      throw new ServiceUnavailableException(
        `No verified market data was returned for ${requested}. Try the exact ticker shown by search.`,
      );
    }

    const latest = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : null;
    const price = this.num(latest.price);

    if (price === null || price <= 0) {
      throw new ServiceUnavailableException(`Yahoo Finance returned an invalid historical close for ${requested}.`);
    }

    const previousClose = this.num(previous?.price);
    const changePercent = previousClose && previousClose > 0
      ? ((price - previousClose) / previousClose) * 100
      : 0;

    const historyMetrics = this.historyMetrics(history);

    // Fundamentals are optional. Yahoo Finance may not expose quoteSummary for
    // every exchange/instrument. Missing values remain null.
    const fundamentals = await this.yahooFundamentals(requested);
    const summary = fundamentals?.quoteSummary?.result?.[0] || {};
    const flat = this.flattenNumbers(summary);

    const pe = this.pickStat(flat, [
      "trailingpe", "forwardpe", "pe_ratio", "pe", "price_to_earnings",
    ]);
    const marketCap = this.pickStat(flat, [
      "marketcap", "marketcapitalization",
    ]);
    const revenueGrowth = this.pickStat(flat, [
      "revenuegrowth", "revenue_growth", "revenuegrowthyoy",
    ]);
    const profitGrowth = this.pickStat(flat, [
      "earningsgrowth", "profitgrowth", "netincomegrowth", "epsgrowth",
    ]);
    const debtToEquity = this.pickStat(flat, [
      "debtequity", "debttoequity", "debt_equity",
    ]);
    const beta = this.pickStat(flat, [
      "beta", "beta3year", "beta5yearmonthly",
    ]);

    const providerSymbol = String(meta.symbol || this.yahooSymbol(requested));
    const providerExchange = String(meta.fullExchangeName || meta.exchangeName || meta.exchange || "");
    const appSym = this.appSymbol(providerSymbol, providerExchange);
    const exchange = providerExchange || (
      this.providerRef(requested).exchange === "BSE" ? "BSE" :
      this.providerRef(requested).exchange === "NSE" ? "NSE" : "Global"
    );
    const name = String(
      meta.longName ||
      meta.shortName ||
      summary?.price?.longName?.raw ||
      summary?.price?.shortName?.raw ||
      requested,
    );
    const currency = this.currency(appSym, exchange, String(meta.currency || summary?.price?.currency || ""));
    const sector = String(summary?.assetProfile?.sector || "Not available");

    const asset: Asset = {
      symbol: appSym,
      exchange,
      name,
      assetType: String(meta.instrumentType || "Equity"),
      sector,
      price,
      changePercent,
      currency,
      pe,
      marketCap,
      revenueGrowth,
      profitGrowth,
      debtToEquity,
      volatility: historyMetrics.volatility,
      maxDrawdown: historyMetrics.maxDrawdown,
      beta,
      historicalAnnualizedReturn: historyMetrics.annualizedReturn,
      historicalPeriodDays: historyMetrics.periodDays,
      qualityScore: null,
      riskScore: null,
      hypeScore: null,
      personalFit: null,
      dataCompleteness: 0,
      dataWarnings: [],
      dataProvider: "Yahoo Finance",
      dataFreshness: "eod",
    };

    const news = await this.newsFeed(asset.symbol, asset.name);
    asset.qualityScore = this.quality(asset);
    asset.riskScore = this.risk(asset);
    asset.hypeScore = this.hype(asset, news, historyMetrics);

    const fields = [asset.price, asset.pe, asset.marketCap, asset.revenueGrowth, asset.profitGrowth, asset.debtToEquity, asset.volatility, asset.maxDrawdown, asset.beta];
    asset.dataCompleteness = Math.round(fields.filter(x => x !== null).length / fields.length * 100);

    if (asset.pe === null) asset.dataWarnings.push("P/E is unavailable from Yahoo Finance for this instrument.");
    if (asset.revenueGrowth === null) asset.dataWarnings.push("Revenue growth is unavailable from Yahoo Finance for this instrument.");
    if (asset.profitGrowth === null) asset.dataWarnings.push("Profit growth is unavailable from Yahoo Finance for this instrument.");
    if (asset.debtToEquity === null) asset.dataWarnings.push("Debt / Equity is unavailable from Yahoo Finance for this instrument.");
    if (asset.volatility === null || asset.maxDrawdown === null) asset.dataWarnings.push("There is not enough historical price data to calculate volatility and drawdown.");
    if (asset.beta === null) asset.dataWarnings.push("Beta is unavailable from Yahoo Finance for this instrument.");
    if (asset.hypeScore === null) asset.dataWarnings.push("A complete hype score could not be calculated because some attention signals are unavailable.");
    if (asset.historicalAnnualizedReturn === null) asset.dataWarnings.push("A historical annualized return could not be calculated from the available price history.");
    asset.dataWarnings.push("Some fundamentals may be unavailable because Yahoo Finance does not expose them consistently for every instrument. THESIS leaves missing fields blank rather than inventing values.");

    return asset;
  }

  async bundle(symbol: string, userId: string) {
    const analysis = await this.analysis(symbol, userId);
    const [chart, news] = await Promise.all([this.chart(symbol), this.newsFeed(analysis.asset.symbol, analysis.asset.name)]);
    return { ...analysis, chart, news };
  }

  async analysis(symbol: string, userId: string) {
    const [asset, profile] = await Promise.all([this.getAsset(symbol), this.getProfile(userId)]);
    asset.personalFit = profile ? this.fit(asset, profile) : null;
    return {
      asset,
      profile,
      market: { price: asset.price, changePercent: asset.changePercent },
      fundamentals: {
        pe: asset.pe,
        marketCap: asset.marketCap,
        revenueGrowth: asset.revenueGrowth,
        profitGrowth: asset.profitGrowth,
        debtToEquity: asset.debtToEquity,
        beta: asset.beta,
      },
      risk: {
        score: asset.riskScore,
        level: asset.riskScore === null ? "unavailable" : asset.riskScore <= 30 ? "low" : asset.riskScore <= 60 ? "moderate" : asset.riskScore <= 80 ? "high" : "very-high",
        weights: { volatility: .30, drawdown: .20, debt: .15, earningsStability: .15, valuation: .10, marketSensitivity: .10 },
        note: "Weights are normalized across the verified signals actually available for this asset.",
      },
      hype: {
        score: asset.hypeScore,
        level: asset.hypeScore === null ? "unavailable" : asset.hypeScore <= 30 ? "low" : asset.hypeScore <= 60 ? "moderate" : asset.hypeScore <= 80 ? "high" : "extreme",
        method: "price acceleration + available news/attention signals + any verified fundamental divergence",
      },
      quality: { score: asset.qualityScore },
      personalFit: {
        score: asset.personalFit,
        reason: asset.personalFit === null
          ? "Complete Investor DNA to calculate a personal fit."
          : asset.personalFit >= 75
            ? "This asset broadly matches your risk, horizon and growth preferences."
            : asset.personalFit >= 55
              ? "There is a mixed fit; the trade-offs deserve a closer look."
              : "This asset may sit outside your current comfort zone.",
      },
      dataProvider: "Yahoo Finance",
      dataFreshness: asset.dataFreshness,
      dataWarnings: asset.dataWarnings,
      explanation: asset.hypeScore !== null && asset.hypeScore > 70
        ? "Attention is elevated relative to the available fundamentals and market signals. Popularity is not evidence of future returns."
        : "Use the evidence together: business quality, valuation, risk, attention and your own behavior.",
    };
  }

  async batch(symbols: string[], userId: string) {
    return Promise.all(symbols.filter(Boolean).slice(0, 8).map(s => this.analysis(s, userId)));
  }

  async chart(symbol: string) {
    const series = await this.priceSeries(decodeURIComponent(symbol).toUpperCase());
    if (!series.length) throw new ServiceUnavailableException("Historical price data is unavailable for this symbol.");
    return series.slice(-120);
  }

  async news(symbol: string) {
    const asset = await this.getAsset(symbol);
    return this.newsFeed(asset.symbol, asset.name);
  }

  async persistSnapshot(symbol: string, userId: string) {
    if (!this.pool) throw new ServiceUnavailableException("Supabase is not configured.");
    const asset = await this.getAsset(symbol);
    const row = await query<{ id: string }>(
      this.pool,
      `INSERT INTO assets(symbol,exchange,name,sector,asset_type)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(symbol) DO UPDATE SET exchange=EXCLUDED.exchange,name=EXCLUDED.name,sector=EXCLUDED.sector,asset_type=EXCLUDED.asset_type
       RETURNING id`,
      [asset.symbol, asset.exchange, asset.name, asset.sector, asset.assetType],
    );
    await query(
      this.pool,
      `INSERT INTO asset_snapshots(asset_id,price,pe,market_cap,revenue_growth,profit_growth,debt_to_equity,volatility,max_drawdown,beta,risk_score,hype_score,quality_score,personal_fit,user_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [row.rows[0].id, asset.price, asset.pe, asset.marketCap, asset.revenueGrowth, asset.profitGrowth, asset.debtToEquity, asset.volatility, asset.maxDrawdown, asset.beta, asset.riskScore, asset.hypeScore, asset.qualityScore, asset.personalFit, userId],
    );
  }
}
