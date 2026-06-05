import { db } from '@/db/client';
import { appSettings } from '@/db/schema';

/**
 * Platform fiyatları — admin panelden ayarlanabilir (USD cent).
 *
 * Tek kaynak: `app_settings` tablosu (key→value_int). Kod tarafı buradan okur;
 * tablo henüz migrate edilmemişse veya satır yoksa `PRICE_DEFAULTS`'a düşer
 * (eski hardcoded değerler). 60sn in-memory cache; admin güncellemesi cache'i temizler.
 */

// İç anahtar → DB key eşlemesi
export const PRICE_KEYS = {
  date_renewal: 'price_date_renewal',
  istbaku_badge: 'price_istbaku_badge',
  private: 'price_private',
  tier_guclu: 'price_tier_guclu',
  tier_premium: 'price_tier_premium',
  rpa_report: 'price_rpa_report',
} as const;

export type PriceKey = keyof typeof PRICE_KEYS;

// Fallback (DB yoksa) — migration ile aynı default'lar.
export const PRICE_DEFAULTS: Record<PriceKey, number> = {
  date_renewal: 1900,
  istbaku_badge: 4900,
  private: 9900,
  tier_guclu: 900,
  tier_premium: 2900,
  rpa_report: 4900,
};

// Admin UI etiketleri
export const PRICE_LABELS: Record<PriceKey, string> = {
  date_renewal: 'Tarih yenileme',
  istbaku_badge: 'İstBaku Onaylı rozet',
  private: 'Gizli portföy',
  tier_guclu: 'Tier yükseltme — Güçlü',
  tier_premium: 'Tier yükseltme — Premium',
  rpa_report: 'RPA Raporu',
};

let cache: { at: number; map: Record<PriceKey, number> } | null = null;
const TTL = 60_000;

/** Tüm fiyatları döndürür (cent). Hata/eksik tabloda fallback kullanır. */
export async function getAllPrices(): Promise<Record<PriceKey, number>> {
  if (cache && Date.now() - cache.at < TTL) return cache.map;
  const map = { ...PRICE_DEFAULTS };
  try {
    const rows = await db.select().from(appSettings);
    const byDbKey = new Map(rows.map((r) => [r.key, r.valueInt]));
    for (const k of Object.keys(PRICE_KEYS) as PriceKey[]) {
      const v = byDbKey.get(PRICE_KEYS[k]);
      if (typeof v === 'number' && v > 0) map[k] = v;
    }
  } catch (err) {
    // app_settings tablosu henüz yoksa migration öncesi → fallback default'lar
    console.warn('getAllPrices: app_settings okunamadı, fallback kullanılıyor', err);
  }
  cache = { at: Date.now(), map };
  return map;
}

/** Tek bir fiyatı döndürür (cent). */
export async function getPrice(key: PriceKey): Promise<number> {
  const all = await getAllPrices();
  return all[key];
}

/** Admin: fiyatları upsert eder ve cache'i geçersiz kılar. */
export async function setPrices(updates: Partial<Record<PriceKey, number>>): Promise<void> {
  const entries = Object.entries(updates) as [PriceKey, number][];
  for (const [k, v] of entries) {
    if (!(k in PRICE_KEYS) || !Number.isFinite(v) || v < 0) continue;
    const value = Math.round(v);
    await db
      .insert(appSettings)
      .values({ key: PRICE_KEYS[k], valueInt: value })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { valueInt: value, updatedAt: new Date() },
      });
  }
  cache = null;
}
