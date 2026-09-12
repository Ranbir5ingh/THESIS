import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { join } from "node:path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing. Configure your Supabase Postgres connection.");
  const pool = new Pool({ connectionString: url, ssl: url.includes("supabase.com") ? { rejectUnauthorized: false } : undefined });
  const sql = await readFile(join(process.cwd(), "../../supabase/schema.sql"), "utf8");
  await pool.query(sql);
  await pool.end();
  console.log("✓ Supabase schema applied");
}
main().catch((e) => { console.error(e); process.exit(1); });
