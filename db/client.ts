import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production.');
    }
    console.warn('[db] DATABASE_URL eksik — localhost fallback kullanılıyor.');
  }

  const url = connectionString ?? 'postgres://localhost';
  const sql = globalThis.__pgClient ?? postgres(url, {
    max: 25,
    idle_timeout: 10,
    connect_timeout: 10,
    prepare: false,
  });

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__pgClient = sql;
  }

  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createClient> | null = null;

export const db = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop, receiver) {
    if (!_db) _db = createClient();
    return Reflect.get(_db, prop, receiver);
  },
});

export type DbClient = ReturnType<typeof createClient>;
