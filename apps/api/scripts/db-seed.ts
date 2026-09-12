import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing");
  const pool = new Pool({ connectionString: url, ssl: url.includes("supabase.com") ? { rejectUnauthorized: false } : undefined });
  const assets = [
    ["RELIANCE", "NSE", "Reliance Industries", "Energy & Conglomerates"],
    ["TCS", "NSE", "Tata Consultancy Services", "Information Technology"],
    ["NVIDIA", "NASDAQ", "NVIDIA Corporation", "Semiconductors"],
    ["APPLE", "NASDAQ", "Apple Inc.", "Technology"],
  ];
  for (const a of assets) await pool.query(`insert into assets(symbol,exchange,name,sector) values($1,$2,$3,$4) on conflict(symbol) do nothing`, a);
  await pool.end();
  console.log("✓ Seeded demo assets");
}
main().catch((e) => { console.error(e); process.exit(1); });
