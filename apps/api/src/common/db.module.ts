import { Global, Module } from "@nestjs/common";
import { Pool } from "pg";

export const DB = Symbol("DB");

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) return null;
        return new Pool({
          connectionString,
          max: Number(process.env.DB_POOL_MAX ?? 5),
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
          ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
        });
      },
    },
  ],
  exports: [DB],
})
export class DbModule {}
