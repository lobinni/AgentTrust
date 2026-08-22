import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// NOTE: The pg Pool connects lazily — it does NOT connect at import time.
// This means the Next.js build (and Vercel build) never touches the
// database, so a missing DATABASE_URL will not break `next build`.
// If DATABASE_URL is missing at runtime, queries fail gracefully and
// API routes return a 500 with a clear message (see dbReady() below).
const connectionString =
  databaseUrl ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString,
    // Fast fail instead of hanging when DB is unreachable
    connectionTimeoutMillis: 5000,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);

/**
 * True when DATABASE_URL is configured. Use in UI/API to show a
 * friendly "database not configured" state instead of stack traces.
 */
export function dbReady(): boolean {
  return Boolean(databaseUrl);
}
