import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Pool } from "pg";
import { DB } from "../common/db.module";
import { query } from "../common/db";

type Asset = {
  symbol: string; exchange: string; name: string; price: number; changePercent: number;
  sector: string; pe: number; marketCap: number; revenueGrowth: number; profitGrowth: number;
  debtToEquity: number; volatility: number; maxDrawdown: number; qualityScore: number;
  riskScore: number; hypeScore: number; personalFit: number; currency?: string;
  dataSource?: "live" | "demo";
};

type CacheEntry = { expires: number; value: any };

const CURATED: Asset[] = [
  {symbol:"RELIANCE",exchange:"NSE",name:"Reliance Industries",price:1482.3,changePercent:1.84,sector:"Energy & Conglomerates",pe:24.6,marketCap:2000000,revenueGrowth:14.2,profitGrowth:18.1,debtToEquity:.38,volatility:38,maxDrawdown:24,qualityScore:88,riskScore:42,hypeScore:29,personalFit:84,currency:"INR",dataSource:"demo"},
  {symbol:"TCS",exchange:"NSE",name:"Tata Consultancy Services",price:3912,changePercent:-.42,sector:"Information Technology",pe:29.1,marketCap:1400000,revenueGrowth:7.8,profitGrowth:9.4,debtToEquity:.08,volatility:25,maxDrawdown:19,qualityScore:91,riskScore:31,hypeScore:21,personalFit:88,currency:"INR",dataSource:"demo"},
  {symbol:"HDFCBANK",exchange:"NSE",name:"HDFC Bank",price:1748,changePercent:.61,sector:"Financial Services",pe:19.8,marketCap:1320000,revenueGrowth:13.1,profitGrowth:12.6,debtToEquity:5.9,volatility:28,maxDrawdown:17,qualityScore:86,riskScore:39,hypeScore:25,personalFit:86,currency:"INR",dataSource:"demo"},
  {symbol:"INFY",exchange:"NSE",name:"Infosys",price:1642,changePercent:1.12,sector:"Information Technology",pe:25.4,marketCap:680000,revenueGrowth:8.2,profitGrowth:10.1,debtToEquity:.11,volatility:27,maxDrawdown:21,qualityScore:87,riskScore:34,hypeScore:24,personalFit:87,currency:"INR",dataSource:"demo"},
  {symbol:"NVDA",exchange:"NASDAQ",name:"NVIDIA Corporation",price:177.21,changePercent:2.7,sector:"Semiconductors",pe:48.3,marketCap:4300000,revenueGrowth:42,profitGrowth:51,debtToEquity:.18,volatility:62,maxDrawdown:36,qualityScore:92,riskScore:64,hypeScore:87,personalFit:68,currency:"USD",dataSource:"demo"},
  {symbol:"AAPL",exchange:"NASDAQ",name:"Apple Inc.",price:241.8,changePercent:.66,sector:"Technology",pe:34.7,marketCap:3600000,revenueGrowth:6.4,profitGrowth:8.2,debtToEquity:1.46,volatility:31,maxDrawdown:22,qualityScore:90,riskScore:45,hypeScore:48,personalFit:79,currency:"USD",dataSource:"demo"},
  {symbol:"MSFT",exchange:"NASDAQ",name:"Microsoft Corporation",price:505.2,changePercent:.88,sector:"Technology",pe:36.1,marketCap:3760000,revenueGrowth:15.4,profitGrowth:16.9,debtToEquity:.32,volatility:26,maxDrawdown:19,qualityScore:94,riskScore:38,hypeScore:54,personalFit:83,currency:"USD",dataSource:"demo"},
  {symbol:"TSLA",exchange:"NASDAQ",name:"Tesla Inc.",price:347.4,changePercent:-1.32,sector:"Automotive & Energy",pe:168,revenueGrowth:7.1,profitGrowth:-19.4,debtToEquity:.84,marketCap:1100000,volatility:69,maxDrawdown:49,qualityScore:67,riskScore:78,hypeScore:90,personalFit:52,currency:"USD",dataSource:"demo"}
];

// Useful offline autocomplete coverage. It is metadata only; prices/fundamentals still come from Alpha Vantage.
const CATALOG = [
  ["RELIANCE","Reliance Industries","India"],["TCS","Tata Consultancy Services","India"],["INFY","Infosys","India"],["HDFCBANK","HDFC Bank","India"],["ICICIBANK","ICICI Bank","India"],["SBIN","State Bank of India","India"],["ITC","ITC Limited","India"],["LT","Larsen & Toubro","India"],["BHARTIARTL","Bharti Airtel","India"],["MARUTI","Maruti Suzuki India","India"],["SUNPHARMA","Sun Pharmaceutical Industries","India"],["TITAN","Titan Company","India"],["ADANIENT","Adani Enterprises","India"],["ADANIPORTS","Adani Ports","India"],["WIPRO","Wipro","India"],["AXISBANK","Axis Bank","India"],["KOTAKBANK","Kotak Mahindra Bank","India"],["ASIANPAINT","Asian Paints","India"],["HINDUNILVR","Hindustan Unilever","India"],["BAJFINANCE","Bajaj Finance","India"],
  ["NVDA","NVIDIA Corporation","United States"],["AAPL","Apple Inc.","United States"],["MSFT","Microsoft Corporation","United States"],["AMZN","Amazon.com Inc.","United States"],["GOOGL","Alphabet Inc.","United States"],["META","Meta Platforms Inc.","United States"],["TSLA","Tesla Inc.","United States"],["AVGO","Broadcom Inc.","United States"],["NFLX","Netflix Inc.","United States"],["AMD","Advanced Micro Devices","United States"],["JPM","JPMorgan Chase","United States"],["V","Visa Inc.","United States"],["WMT","Walmart Inc.","United States"],["COST","Costco Wholesale","United States"]
].map(([symbol,name,exchange]) => ({symbol,name,exchange}));

@Injectable()
export class MarketService {
  private readonly cache = new Map<string, CacheEntry>();
  constructor(@Inject(DB) private readonly pool: Pool | null) {}

  private cacheGet<T>(key: string): T | null {
    const hit = this.cache.get(key);
    if (!hit || hit.expires < Date.now()) { if (hit) this.cache.delete(key); return null; }
    return hit.value as T;
  }
  private cacheSet(key: string, value: any, ttlMs: number) { this.cache.set(key, {expires: Date.now()+ttlMs, value}); }

  private async av(params: Record<string,string>, ttlMs = 5 * 60_000) {
    const key = JSON.stringify(params);
    const cached = this.cacheGet<any>(key); if (cached) return cached;
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) return null;
    try {
      const u = new URL("https://www.alphavantage.co/query");
      Object.entries({...params, apikey:apiKey}).forEach(([k,v]) => u.searchParams.set(k,v));
      const r = await fetch(u, {signal: AbortSignal.timeout(9000), headers:{accept:"application/json"}});
      if (!r.ok) return null;
      const j = await r.json() as any;
      if (j?.Note || j?.Information || j?.Error) {
        console.warn("Alpha Vantage response:", j?.Note || j?.Information || j?.Error);
        return null;
      }
      this.cacheSet(key,j,ttlMs); return j;
    } catch { return null; }
  }

  private inferCurrency(symbol:string, exchange:string, providerCurrency?:string) {
    const s = symbol.toUpperCase();
    const e = exchange.toUpperCase();
    if (s.endsWith(".BSE") || s.endsWith(".NSE") || e.includes("BSE") || e.includes("NSE") || e === "INDIA") return "INR";
    if (providerCurrency && /^[A-Z]{3}$/.test(providerCurrency)) return providerCurrency;
    return "USD";
  }

  private newsCandidates(symbol:string) {
    const s = decodeURIComponent(symbol).toUpperCase();
    const base = s.split(".")[0];
    return Array.from(new Set([s, base].filter(Boolean)));
  }

  private async googleNews(query:string) {
    const key = `google-news:${query.toLowerCase()}`;
    const cached = this.cacheGet<any[]>(key);
    if (cached) return cached;
    try {
      const u = new URL("https://news.google.com/rss/search");
      u.searchParams.set("q", query);
      u.searchParams.set("hl", "en-IN");
      u.searchParams.set("gl", "IN");
      u.searchParams.set("ceid", "IN:en");
      const r = await fetch(u, {signal: AbortSignal.timeout(8000), headers:{accept:"application/rss+xml, application/xml, text/xml"}});
      if (!r.ok) return [];
      const xml = await r.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m => m[1]);
      const clean = (value:string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();
      const extract = (item:string, tag:string) => {
        const m = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
        return m ? clean(m[1]) : "";
      };
      const result = items.slice(0,8).map(item => ({
        title: extract(item,"title"),
        url: extract(item,"link"),
        source: extract(item,"source") || "Google News",
        time: extract(item,"pubDate"),
        sentiment: 0,
        summary: ""
      })).filter(x => x.title && x.url);
      this.cacheSet(key, result, 10*60_000);
      return result;
    } catch { return []; }
  }

  async search(q = "") {
    const term = q.trim();
    if (!term) return CURATED;
    const remote = await this.av({function:"SYMBOL_SEARCH",keywords:term}, 30*60_000);
    const matches = Array.isArray(remote?.bestMatches) ? remote.bestMatches.map((x:any) => ({
      symbol:x["1. symbol"], name:x["2. name"], exchange:x["4. region"] || "Global",
      sector:x["3. type"] || "Equity", price:null, changePercent:null, personalFit:null,
      riskScore:null, hypeScore:null, currency:this.inferCurrency(String(x["1. symbol"]||""), String(x["4. region"]||"Global"), String(x["8. currency"]||"")), matchScore:Number(x["9. matchScore"]||0)
    })).filter((x:any)=>x.symbol&&x.name) : [];
    if (matches.length) return matches.sort((a:any,b:any)=>b.matchScore-a.matchScore).slice(0,12);
    const n = term.toUpperCase();
    const curated = CURATED.filter(a=>`${a.symbol} ${a.name} ${a.sector}`.toUpperCase().includes(n));
    const catalog = CATALOG.filter((a:any)=>`${a.symbol} ${a.name} ${a.exchange}`.toUpperCase().includes(n));
    const merged = [...curated,...catalog.filter((a:any)=>!curated.some(c=>c.symbol===a.symbol))];
    return merged.slice(0,12);
  }

  private clone(a:Asset) { return {...a}; }
  private providerSymbols(symbol:string) {
    const s = symbol.toUpperCase();
    if (s.includes(".")) return [s];
    // Alpha Vantage documents BSE symbols such as RELIANCE.BSE; try the plain ticker too for US/global names.
    return [s, `${s}.BSE`];
  }

  async getAsset(symbol:string): Promise<Asset> {
    const requested = decodeURIComponent(symbol).toUpperCase();
    const curated = CURATED.find(a => a.symbol===requested || `${a.symbol}.BSE`===requested);
    const providerList = this.providerSymbols(requested);

    for (const candidate of providerList) {
      const [quote, overview] = await Promise.all([
        this.av({function:"GLOBAL_QUOTE",symbol:candidate}),
        this.av({function:"OVERVIEW",symbol:candidate}, 30*60_000)
      ]);
      const q = quote?.["Global Quote"] ?? {};
      const o = overview ?? {};
      const price = Number(q["05. price"] || 0);
      if (price > 0 || Object.keys(o).length > 3) {
        if (curated) {
          const a = this.clone(curated); a.dataSource="live";
          if (price > 0) { a.price=price; a.changePercent=Number(String(q["10. change percent"]??0).replace("%","")); }
          return a;
        }
        const a:Asset = {
          symbol:candidate, exchange:String(o.Exchange||"Global"), name:String(o.Name||candidate),
          price, changePercent:Number(String(q["10. change percent"]||0).replace("%","")),
          sector:String(o.Sector||o.Industry||"Equity"), pe:Number(o.PERatio)||0,
          marketCap:Number(o.MarketCapitalization)||0,
          revenueGrowth:Number(String(o.QuarterlyRevenueGrowthYOY||0).replace("%",""))||0,
          profitGrowth:Number(String(o.QuarterlyEarningsGrowthYOY||0).replace("%",""))||0,
          debtToEquity:Number(o.DebtToEquity)||0, volatility:45, maxDrawdown:30,
          qualityScore:72, riskScore:52, hypeScore:45, personalFit:74,
          currency:this.inferCurrency(candidate, String(o.Exchange||"Global"), String(o.Currency||"")), dataSource:"live"
        };
        return this.deriveScores(a);
      }
    }

    if (curated) return this.clone(curated);
    throw new ServiceUnavailableException(`Live market data is unavailable for ${requested}. Check ALPHA_VANTAGE_API_KEY or try again after the provider limit resets.`);
  }

  private risk(a:Asset) {
    return Math.round(.30*Math.min(100,a.volatility)+.20*Math.min(100,a.maxDrawdown*1.6)+.15*Math.min(100,a.debtToEquity*20)+.15*Math.min(100,Math.abs(a.profitGrowth-10)*3)+.10*Math.min(100,Math.max(0,(a.pe-18)*2.2))+.10*Math.min(100,a.volatility));
  }
  private deriveScores(a:Asset) {
    a.riskScore=this.risk(a);
    a.hypeScore=Math.round(Math.min(100,Math.max(0,a.hypeScore+Math.max(0,a.changePercent)*1.5+Math.max(0,a.pe-30)*.25)));
    a.personalFit=Math.max(0,Math.min(100,Math.round(a.qualityScore*.35+(100-a.riskScore)*.3+Math.min(100,a.revenueGrowth*4)*.2+(100-a.hypeScore)*.15)));
    return a;
  }

  async analysis(symbol:string) {
    const a=this.deriveScores(await this.getAsset(symbol));
    return {asset:a,market:{price:a.price,changePercent:a.changePercent},fundamentals:{pe:a.pe,marketCap:a.marketCap,revenueGrowth:a.revenueGrowth,profitGrowth:a.profitGrowth,debtToEquity:a.debtToEquity},risk:{score:a.riskScore,level:a.riskScore<=30?"low":a.riskScore<=60?"moderate":a.riskScore<=80?"high":"very-high"},hype:{score:a.hypeScore,level:a.hypeScore<=30?"low":a.hypeScore<=60?"moderate":a.hypeScore<=80?"high":"extreme"},quality:{score:a.qualityScore},personalFit:{score:a.personalFit},explanation:a.hypeScore>70?"Attention is elevated relative to the underlying fundamentals. Popularity is not evidence of future returns.":"Attention looks comparatively measured; the bigger question is whether future growth justifies today’s price."};
  }

  async chart(symbol:string) {
    const requested=decodeURIComponent(symbol).toUpperCase();
    const candidates=this.providerSymbols(requested);
    for (const candidate of candidates) {
      const remote=await this.av({function:"TIME_SERIES_DAILY",symbol:candidate,outputsize:"compact"},15*60_000);
      const series=remote?.["Time Series (Daily)"];
      if (series) return Object.entries(series).slice(0,100).reverse().map(([date,v]:any)=>({date,price:Number(v["4. close"]),volume:Number(v["5. volume"])}));
      const weekly=await this.av({function:"TIME_SERIES_WEEKLY",symbol:candidate},30*60_000);
      const w=weekly?.["Weekly Time Series"];
      if (w) return Object.entries(w).slice(0,52).reverse().map(([date,v]:any)=>({date,price:Number(v["4. close"]),volume:Number(v["5. volume"])}));
    }
    const a=await this.getAsset(requested);
    // Only demo assets get a deterministic visual fallback; never fabricate a history for live assets.
    if (a.dataSource === "demo") return Array.from({length:70},(_,i)=>({date:`D-${69-i}`,price:Number((a.price*(.94+i*.0012+Math.sin(i/4)*.009)).toFixed(2)),volume:0}));
    throw new ServiceUnavailableException(`Historical price data is unavailable for ${a.symbol}.`);
  }

  async news(symbol:string) {
    const candidates = this.newsCandidates(symbol);
    for (const ticker of candidates) {
      const remote = await this.av({function:"NEWS_SENTIMENT",tickers:ticker,limit:"8",sort:"LATEST"},10*60_000);
      const feed = Array.isArray(remote?.feed) ? remote.feed : [];
      if (feed.length) {
        return feed.slice(0,8).map((x:any)=>({
          title:x.title,
          source:x.source || "Alpha Vantage",
          url:x.url,
          time:x.time_published,
          sentiment:Number(x.overall_sentiment_score)||0,
          summary:x.summary || ""
        }));
      }
    }

    // Alpha Vantage can have ticker coverage gaps, especially for smaller exchanges.
    // Use Google News RSS as a no-key fallback rather than manufacturing stories.
    const requested = decodeURIComponent(symbol).toUpperCase();
    const catalog = CATALOG.find((x:any)=>x.symbol===requested || `${x.symbol}.BSE`===requested || `${x.symbol}.NSE`===requested);
    const curated = CURATED.find(a=>a.symbol===requested || `${a.symbol}.BSE`===requested);
    const name = curated?.name || catalog?.name || requested.replace(/\.(BSE|NSE)$/i,"");
    const query = `${name} stock shares`;
    return this.googleNews(query);
  }

  async persistSnapshot(symbol:string){
    if(!this.pool)return; const a=await this.getAsset(symbol);
    const row=await query<{id:string}>(this.pool,`INSERT INTO assets(symbol,exchange,name,sector,asset_type) VALUES($1,$2,$3,$4,'stock') ON CONFLICT(symbol) DO UPDATE SET name=EXCLUDED.name,sector=EXCLUDED.sector RETURNING id`,[a.symbol,a.exchange,a.name,a.sector]);
    await query(this.pool,`INSERT INTO asset_snapshots(asset_id,price,pe,market_cap,revenue_growth,profit_growth,debt_to_equity,volatility,max_drawdown,risk_score,hype_score,quality_score,personal_fit) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[row.rows[0].id,a.price,a.pe,a.marketCap,a.revenueGrowth,a.profitGrowth,a.debtToEquity,a.volatility,a.maxDrawdown,a.riskScore,a.hypeScore,a.qualityScore,a.personalFit]);
  }
}
