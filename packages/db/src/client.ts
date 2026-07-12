import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10 });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
export type Transaction = Parameters<
  Parameters<Db["transaction"]>[0]
>[0];

export * from "./schema";
export { asc, eq, inArray } from "drizzle-orm";
export {
  bootstrapAdmin,
  hashPassword,
  verifyPassword,
} from "./bootstrap-admin";
export { seedWatchSources, INITIAL_WATCH_SOURCES } from "./seed-watch-sources";
