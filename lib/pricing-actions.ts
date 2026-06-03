'use server';

import { db } from '@/db/client';
import { auditLog } from '@/db/schema';
import { getCurrentAdmin } from './auth-actions';
import { setPrices, getAllPrices, PRICE_KEYS, type PriceKey } from './pricing';
import { revalidatePath } from 'next/cache';

/**
 * Admin: platform fiyatlarını günceller (USD cent). Yetki kontrolü + audit log.
 * Boş/geçersiz alanlar atlanır. Fiyat değişikliği ISR sayfaları için ilgili
 * path'leri revalidate eder.
 */
export async function updatePricingAction(
  updates: Partial<Record<PriceKey, number>>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: 'Yetkisiz.' };

  // Yalnızca bilinen anahtarları, makul aralıkta (0–10.000 USD = 1.000.000 cent) al.
  const clean: Partial<Record<PriceKey, number>> = {};
  for (const k of Object.keys(PRICE_KEYS) as PriceKey[]) {
    const v = updates[k];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1_000_000) {
      clean[k] = Math.round(v);
    }
  }
  if (Object.keys(clean).length === 0) return { ok: false, error: 'Geçerli fiyat yok.' };

  try {
    await setPrices(clean);
    await db.insert(auditLog).values({
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'Platform fiyatları güncellendi',
      target: 'app_settings',
      meta: clean,
    });
    revalidatePath('/new-listing');
    revalidatePath('/admin/pricing');
    return { ok: true };
  } catch (err) {
    console.error('updatePricing error', err);
    return { ok: false, error: 'Fiyat güncelleme başarısız.' };
  }
}

/** Admin sayfası için mevcut fiyatları döndürür. */
export async function getPricingAction(): Promise<Record<PriceKey, number>> {
  return getAllPrices();
}
