import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { neighborhoods } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

/**
 * G1 — il/ilçe için mahalle listesi (datalist). country+city (zorunlu) + district (ops.).
 * Veri yoksa boş döner; istemci statik küratörlü listeye düşer.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const country = (url.searchParams.get('country') || '').toUpperCase().slice(0, 8);
  const city = (url.searchParams.get('city') || '').trim();
  const district = (url.searchParams.get('district') || '').trim();
  if (!country || !city) return NextResponse.json({ names: [] });
  try {
    const conds = [
      eq(neighborhoods.country, country),
      sql`lower(${neighborhoods.city}) = lower(${city})`,
    ];
    if (district) conds.push(sql`lower(${neighborhoods.district}) = lower(${district})`);
    const rows = await db
      .select({ name: neighborhoods.name })
      .from(neighborhoods)
      .where(and(...conds))
      .limit(3000);
    // " Mah"/"Mahallesi" ekini temizle (daha şık görünüm); benzersiz + sıralı.
    const names = [...new Set(rows.map((r) => r.name.replace(/\s+(Mah\.?|Mahallesi)$/i, '').trim()))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'tr'));
    return NextResponse.json({ names }, { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } });
  } catch {
    return NextResponse.json({ names: [] });
  }
}
