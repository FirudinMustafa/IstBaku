// Tur6 migration 0012'yi Neon'a uygular. Çalıştır:  npx tsx db/apply-0012.mjs
import { config } from 'dotenv';
import postgres from 'postgres';
import fs from 'fs';
config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const ddl = fs.readFileSync('db/migrations/0012_tur6.sql', 'utf8');
await sql.unsafe(ddl);
const cols = await sql`
  select table_name, column_name from information_schema.columns
  where (table_name='users' and column_name='private_access')
     or (table_name='agents' and column_name='cover_photo')
     or (table_name='favorites' and column_name='collection_id')
  order by table_name`;
const tbl = await sql`select to_regclass('public.favorite_collections') as t`;
console.log('OK — kolonlar:', cols.map((c) => `${c.table_name}.${c.column_name}`).join(', '));
console.log('OK — favorite_collections:', tbl[0].t);
await sql.end();
