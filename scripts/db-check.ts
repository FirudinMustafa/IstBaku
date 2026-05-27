import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

(async () => {
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    console.log('Tables:', tables.map(t => t.table_name).join(', '));

    const enums = await sql`SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace ORDER BY typname`;
    console.log('Enums:', enums.map(e => e.typname).join(', '));

    const listingsCols = await sql`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'listings' ORDER BY ordinal_position`;
    const c = listingsCols.find(x => x.column_name === 'country');
    console.log('listings.country:', c ? `${c.data_type} (${c.udt_name})` : 'MISSING');
    const daily = listingsCols.filter(x => x.column_name.startsWith('daily_'));
    console.log('listings daily fields:', daily.length === 0 ? 'NONE' : daily.map(x => x.column_name).join(', '));

    const countriesExists = tables.find(t => t.table_name === 'countries');
    if (countriesExists) {
      const rows = await sql`SELECT code, name_tr, enabled FROM countries`;
      console.log('countries:', rows);
    } else {
      console.log('countries table: MISSING');
    }

    const dailyExists = tables.find(t => t.table_name === 'daily_bookings');
    console.log('daily_bookings table:', dailyExists ? 'EXISTS' : 'MISSING');

    try {
      const migrations = await sql`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
      console.log('Applied migrations:', migrations.length);
      migrations.forEach((m: any) => console.log('  ', String(m.hash).slice(0,40), m.created_at));
    } catch (e: any) {
      console.log('drizzle migrations table:', e.message);
    }
  } catch (e: any) {
    console.error('ERROR:', e.message);
  } finally {
    await sql.end();
  }
})();
