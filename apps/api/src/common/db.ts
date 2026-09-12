import type { Pool, QueryResult, QueryResultRow } from "pg";

export async function query<T extends QueryResultRow = QueryResultRow>(pool: Pool | null, text: string, values: any[] = []): Promise<QueryResult<T>> {
  if (!pool) throw new Error("DATABASE_URL is not configured. Configure Supabase before using persistent features.");
  return pool.query<T>(text, values);
}
