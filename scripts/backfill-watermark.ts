/**
 * A1 — Mevcut ONAYLI ama henüz damgalanmamış ilanların TÜM fotoğraflarına kalıcı
 * watermark gömer (yeni onaylar zaten otomatik damgalanıyor). Lightbox dahil her
 * yerde görünür çünkü images[] kalıcı olarak değişir.
 *
 * GEREKLİ env (prod blob deposuna yazacağı için): DATABASE_URL + BLOB_READ_WRITE_TOKEN.
 * Çalıştır:  npx tsx scripts/backfill-watermark.ts
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import postgres from 'postgres';

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('✗ BLOB_READ_WRITE_TOKEN yok. Watermark\'lı görseller prod blob\'a yazılmalı; lokal fs URL\'leri prod\'da çalışmaz. İptal.');
    process.exit(1);
  }
  const { watermarkListingImages } = await import('../lib/watermark');
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  const rows = await sql<{ id: string; images: string[]; cover_src: string | null; cover_kind: string }[]>`
    SELECT id, images, cover_src, cover_kind
    FROM listings
    WHERE approval_status = 'approved'
      AND watermarked = false
      AND jsonb_array_length(images) > 0
    ORDER BY published_at DESC
  `;
  console.log(`${rows.length} onaylı + damgasız ilan bulundu.`);

  let ok = 0, fail = 0;
  for (const r of rows) {
    try {
      const newImages = await watermarkListingImages(r.images);
      let newCover = r.cover_src;
      if (r.cover_kind === 'photo' && r.cover_src) {
        const ci = r.images.indexOf(r.cover_src);
        if (ci >= 0) newCover = newImages[ci];
      }
      await sql`
        UPDATE listings
        SET images = ${JSON.stringify(newImages)}::jsonb,
            cover_src = ${newCover},
            watermarked = true,
            updated_at = now()
        WHERE id = ${r.id}
      `;
      ok++;
      console.log(`  ✓ ${r.id} (${r.images.length} foto)`);
    } catch (e) {
      fail++;
      console.warn(`  ✗ ${r.id}: ${(e as Error).message}`);
    }
  }
  console.log(`\nBitti. Başarılı: ${ok}, Başarısız: ${fail}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
