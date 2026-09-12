import type { Pool, QueryResult, QueryResultRow } from "pg";

export async function query<T extends QueryResultRow = QueryResultRow>(pool: Pool | null, text: string, values: any[] = []): Promise<QueryResult<T>> {
  if (!pool) throw new Error("DATABASE_URL is not configured. Use demo mode or configure Supabase.");
  return pool.query<T>(text, values);
}
