import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL is required in production — refusing to start without it.');
}

if (!connectionString && process.env.NODE_ENV !== 'production') {
  console.warn('[db] DATABASE_URL eksik — localhost fallback kullanılıyor. Bu sadece geliştirme için uygundur.');
}

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

// HMR sırasında bağlantı havuzunu yeniden kullan
// MC-22 — pool sized for modest concurrency; postgres-js idle_timeout is in seconds.
const resolvedConnectionString = connectionString ?? 'postgres://localhost';
const sql = globalThis.__pgClient ?? postgres(resolvedConnectionString, {
  max: 25,
  idle_timeout: 10,
  connect_timeout: 10,
  prepare: false, // pgbouncer / Neon Pooler uyumluluğu
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgClient = sql;
}

export const db = drizzle(sql, { schema });
export type DbClient = typeof db;
