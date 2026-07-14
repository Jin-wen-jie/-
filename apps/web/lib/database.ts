import { createDb, type Db } from "@compare/db";

let database: Db | undefined;

export function getDatabase(): Db {
  if (database) return database;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  database = createDb(databaseUrl, {
    maxConnections: 1,
    ...(usesSupabasePooler(databaseUrl) ? {} : { idleTimeoutSeconds: 20 }),
  });
  return database;
}

function usesSupabasePooler(databaseUrl: string): boolean {
  return new URL(databaseUrl).hostname.endsWith(".pooler.supabase.com");
}
