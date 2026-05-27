'use server';

import { db } from '@/db/client';
import { countryGuides } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentAdmin } from './auth-actions';
import { assertSuperAdmin } from './admin-actions';
import { sanitizeText, sanitizeHttpUrl } from './sanitize';

export async function getCountryGuidesAction() {
  return db.select().from(countryGuides).orderBy(countryGuides.name);
}

export interface GuideInput {
  iso: string;
  name: string;
  flag: string;
  description: string;
  pdfUrl: string;
  pages: number;
  language: 'tr' | 'az' | 'en' | 'ru' | 'de' | 'zh';
}

export async function upsertGuideAction(input: GuideInput): Promise<{ ok: boolean; error?: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: 'Admin yetkisi gerekli.' };

  // Whitelist ISO codes (uppercase ASCII letters, exactly 2 chars).
  const iso = input.iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso)) return { ok: false, error: 'Geçersiz ISO kodu.' };

  // Validate pdfUrl as http(s) only — blocks javascript:/data: open-redirect vectors.
  const pdfUrl = sanitizeHttpUrl(input.pdfUrl);
  if (!pdfUrl) return { ok: false, error: 'PDF URL geçersiz (yalnızca http/https).' };

  const safe = {
    iso,
    name: sanitizeText(input.name, { maxLength: 120 }),
    flag: sanitizeText(input.flag, { maxLength: 16 }),
    description: sanitizeText(input.description, { maxLength: 5_000 }),
    pdfUrl,
    pages: Number.isFinite(input.pages) ? Math.max(0, Math.floor(input.pages)) : 0,
    language: input.language,
  };
  if (!safe.name) return { ok: false, error: 'İsim gerekli.' };

  try {
    const existing = await db.select().from(countryGuides).where(eq(countryGuides.iso, iso)).limit(1);
    if (existing.length > 0) {
      await db.update(countryGuides).set({ ...safe, updatedAt: new Date() }).where(eq(countryGuides.iso, iso));
    } else {
      await db.insert(countryGuides).values({ ...safe, updatedAt: new Date() });
    }
    return { ok: true };
  } catch (err) {
    console.error('upsertGuide', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

/**
 * MH-05: Country guide deletion is destructive (cross-platform impact);
 * restricted to super_admin only.
 */
export async function deleteGuideAction(iso: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertSuperAdmin();
  } catch {
    return { ok: false, error: 'Yalnızca süper admin silebilir.' };
  }
  const normIso = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normIso)) return { ok: false, error: 'Geçersiz ISO.' };
  await db.delete(countryGuides).where(eq(countryGuides.iso, normIso));
  return { ok: true };
}
