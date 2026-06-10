import 'server-only';
import sharp from 'sharp';
import path from 'path';
import { readFile } from 'fs/promises';
import { uploadBuffer } from './storage';

/**
 * Madde 20 — İlan onaylandığında fotoğraflara KALICI (dosyaya gömülü) soldurulmuş
 * logo watermark uygular. Ekran görüntüsü alınsa veya dosya indirilse bile iz kalır.
 * Logo varlığı: public/brand/word-tan.png. Her görsel için orijinal değiştirilmeden
 * YENİ bir blob key'ine damgalı kopya yüklenir; bir görsel işlenemezse orijinali
 * korunur (akış bloklanmaz). `listings.watermarked` flag'i ile idempotenttir.
 */

const LOGO_OPACITY = 0.22;          // soldurma
const LOGO_WIDTH_RATIO = 0.32;      // logo genişliği = görsel genişliğinin ~%32'si

let logoPromise: Promise<Buffer> | null = null;
function getLogo(): Promise<Buffer> {
  if (!logoPromise) {
    logoPromise = readFile(path.join(process.cwd(), 'public', 'brand', 'word-tan.png'));
  }
  return logoPromise;
}

async function watermarkOne(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());

  const meta = await sharp(input).metadata();
  const w = meta.width ?? 1200;
  const logoW = Math.min(w, Math.max(120, Math.round(w * LOGO_WIDTH_RATIO)));

  // Logoyu yeniden boyutlandır + alfasını LOGO_OPACITY ile çarp (dest-in blend).
  const fadedLogo = await sharp(await getLogo())
    .resize({ width: logoW })
    .ensureAlpha()
    .composite([{
      input: Buffer.from([0, 0, 0, Math.round(255 * LOGO_OPACITY)]),
      raw: { width: 1, height: 1, channels: 4 },
      tile: true,
      blend: 'dest-in',
    }])
    .png()
    .toBuffer();

  const out = await sharp(input, { failOn: 'none' })
    .composite([{ input: fadedLogo, gravity: 'center' }])
    .jpeg({ quality: 86 })
    .toBuffer();

  return uploadBuffer(out, 'image/jpeg', 'listings');
}

/**
 * Verilen görsel URL'lerinin her birine watermark gömüp yeni URL'leri döndürür.
 * Sıra korunur (index i → yeni[i]); işlenemeyen görsel için orijinal URL döner.
 */
export async function watermarkListingImages(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(urls.map((u) => watermarkOne(u)));
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.warn('[watermark] görsel işlenemedi:', urls[i], r.reason);
    return urls[i];
  });
}
