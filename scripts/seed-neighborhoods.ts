/**
 * G1 — neighborhoods tablosunu doldurur (TR: turkey-neighbourhoods paketi ~73k mahalle;
 * AZ: lib/data/neighborhoods.ts küratörlü veri). Idempotent: önce TABLOYU temizler.
 * Çalıştır:  npx tsx scripts/seed-neighborhoods.ts   (DATABASE_URL .env.local'den)
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import postgres from 'postgres';
import * as tn from 'turkey-neighbourhoods';
import { ALL_NEIGHBORHOODS } from '../lib/data/neighborhoods';

type Row = { country: string; city: string; district: string; name: string };

function buildRows(): Row[] {
  const rows: Row[] = [];

  // TR — paketten tam veri
  const all = tn.getDistrictsAndNeighbourhoodsOfEachCity() as Record<string, Record<string, string[]>>;
  const nameByCode = tn.cityNamesByCode as Record<string, string>;
  for (const code of Object.keys(all)) {
    const city = nameByCode[code] ?? code;
    for (const district of Object.keys(all[code])) {
      for (const name of all[code][district]) {
        rows.push({ country: 'TR', city, district, name });
      }
    }
  }

  // AZ — küratörlü (Bakı rayonları + büyük şehirler)
  const az = ALL_NEIGHBORHOODS['AZ'] ?? {};
  for (const city of Object.keys(az)) {
    for (const district of Object.keys(az[city])) {
      for (const name of az[city][district]) {
        rows.push({ country: 'AZ', city, district, name });
      }
    }
  }
  return rows;
}

async function main() {
  const rows = buildRows();
  console.log(`Toplam satır: ${rows.length} (TR + AZ)`);
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    await sql`DELETE FROM neighborhoods`;
    const B = 1000;
    for (let i = 0; i < rows.length; i += B) {
      const batch = rows.slice(i, i + B);
      await sql`INSERT INTO neighborhoods ${sql(batch, 'country', 'city', 'district', 'name')}`;
      if (i % 10000 === 0) console.log(`  ...${i}`);
    }
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM neighborhoods`;
    console.log(`✓ Bitti. Tabloda ${count} kayıt.`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
