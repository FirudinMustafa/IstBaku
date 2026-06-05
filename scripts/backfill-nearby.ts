/**
 * Backfill: `nearby` (yakın çevre) verisi boş olan ilanlar için mesafeleri
 * koordinattan yeniden hesaplar.
 *
 * NEDEN: Yakın çevre mesafeleri artık sunucuda koordinattan otomatik hesaplanıp
 * (`fetchNearbyPOIs`) `nearby` jsonb kolonuna yazılıyor (anti-fraud — kullanıcı
 * girişi yok sayılır). Bu akıştan ÖNCE oluşturulmuş eski ilanlarda `nearby` boş
 * ({}). Bu script onları geri-doldurur.
 *
 * NOT: Overpass API'ye dış çağrı yapar; çok sayıda ilan varsa yavaş olabilir.
 * Her ilan arasında küçük bir bekleme ile rate-limit'e takılmamaya çalışır.
 *
 * Çalıştır:  npx tsx scripts/backfill-nearby.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { db } from '../db/client';
import * as s from '../db/schema';
import { eq, sql, isNotNull, and } from 'drizzle-orm';
import { fetchNearbyPOIs } from '../lib/geocode';

function isEmpty(nearby: unknown): boolean {
  return !nearby || (typeof nearby === 'object' && Object.keys(nearby as object).length === 0);
}

async function main() {
  // Koordinatı olan tüm ilanları çek; nearby'si boş olanları doldur.
  const rows = await db
    .select({ id: s.listings.id, slug: s.listings.slug, lat: s.listings.lat, lng: s.listings.lng, nearby: s.listings.nearby })
    .from(s.listings)
    .where(and(isNotNull(s.listings.lat), isNotNull(s.listings.lng)));

  const targets = rows.filter((r) => isEmpty(r.nearby) && r.lat != null && r.lng != null);
  console.log(`Koordinatlı ilan: ${rows.length} — nearby boş olan: ${targets.length}`);

  let done = 0;
  for (const r of targets) {
    try {
      const nearby = await fetchNearbyPOIs({ lat: r.lat as number, lng: r.lng as number });
      if (nearby && Object.keys(nearby).length > 0) {
        await db.update(s.listings).set({ nearby }).where(eq(s.listings.id, r.id));
        done++;
        console.log(`  + ${r.slug}: ${Object.keys(nearby).length} kategori`);
      } else {
        console.log(`  - ${r.slug}: POI bulunamadı (atlandı)`);
      }
    } catch (e) {
      console.warn(`  ! ${r.slug}: hata — ${(e as Error).message}`);
    }
    // Overpass'a nazik ol: ilanlar arasında kısa bekleme.
    await new Promise((res) => setTimeout(res, 1200));
  }
  console.log(`Tamamlandı. Güncellenen ilan: ${done}/${targets.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('HATA:', e.message); process.exit(1); });
