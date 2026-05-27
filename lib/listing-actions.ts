'use server';

import { db } from '@/db/client';
import * as s from '@/db/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { uploadDataUrl } from './storage';
import { slugify } from './utils';
import { sendEmail, tplPaymentReceipt, APP_URL } from './email';
import { sanitizeText, sanitizeLat, sanitizeLng } from './sanitize';
import { confirmPayment } from './payment-confirm';

export interface CreateListingInput {
  type: typeof s.listings.$inferInsert.type;
  purpose: typeof s.listings.$inferInsert.purpose;
  country: string;
  city: string;
  district: string;
  neighborhood?: string;
  address: string;
  lat: number;
  lng: number;
  rooms: string;
  bathrooms: number;
  netArea: number;
  grossArea: number;
  floor: number;
  totalFloors: number;
  buildingAge: number;
  heating: string;
  parking: 'kapali' | 'acik' | 'yok';
  price: number;
  currency: 'USD' | 'EUR' | 'TRY' | 'AZN';
  description: string;
  tier: 'standart' | 'guclu' | 'premium';
  coverKind: 'photo' | 'video';
  coverPhotoIndex: number;
  /** Fotoğraf URL'leri (önceden upload edilmiş) veya data URL'ler (eski uyumluluk) */
  photoDataUrls: string[];
  coverVideoDataUrl?: string;
  region: { aile: number; memur: number; ogrenci: number; yabanci: number };
  /** PR6 — Yakın çevre (yapılandırılmış POI). Boş veya bazıları girilebilir. */
  nearby?: {
    metro?:   { name: string; minutes: number; km: number };
    okul?:    { name: string; minutes: number; km: number };
    hastane?: { name: string; minutes: number; km: number };
    avm?:     { name: string; minutes: number; km: number };
    park?:    { name: string; minutes: number; km: number };
    eczane?:  { name: string; minutes: number; km: number };
    eglence?: { name: string; minutes: number; km: number };
    markets?: { name: string; minutes: number; km: number }[];
  };
  /** PR5 — Günlük kira (opsiyonel) */
  dailyRentalEnabled?: boolean;
  dailyRentalPricePerNight?: number;
  dailyRentalCurrency?: 'USD' | 'EUR' | 'TRY' | 'AZN';
  dailyRentalMinNights?: number;
  dailyRentalNotes?: string;
}

/** UI'dan gelen nearby input'unu DB'nin jsonb şemasına çevirir. Boş alanlar atlanır. */
function buildNearbyFromInput(input: CreateListingInput['nearby']): Record<string, { name: string; minutes: number; km: number } | { name: string; minutes: number; km: number }[]> {
  if (!input) return {};
  const out: Record<string, { name: string; minutes: number; km: number } | { name: string; minutes: number; km: number }[]> = {};
  for (const key of ['metro', 'okul', 'hastane', 'avm', 'park', 'eczane', 'eglence'] as const) {
    const v = input[key];
    if (v && v.name && v.name.trim().length > 0) {
      out[key] = { name: v.name.trim().slice(0, 200), minutes: Math.max(0, Math.round(v.minutes)), km: Math.max(0, Number(v.km.toFixed(2))) };
    }
  }
  const markets = (input.markets ?? []).filter((m) => m.name && m.name.trim().length > 0);
  if (markets.length > 0) {
    out.market = markets.map((m) => ({
      name: m.name.trim().slice(0, 200),
      minutes: Math.max(0, Math.round(m.minutes)),
      km: Math.max(0, Number(m.km.toFixed(2))),
    }));
  }
  return out;
}

function shortScore(c: { lat: number; lng: number; price: number; netArea: number }) {
  // Çok basit mock skor — DB'ye sabit değerle yazmak yerine deterministik bir hesap
  const base = 70;
  const sqmPrice = c.netArea > 0 ? c.price / c.netArea : 0;
  const adj = sqmPrice < 2000 ? 8 : sqmPrice > 6000 ? -6 : 4;
  return Math.max(50, Math.min(95, base + adj));
}

export async function createListingAction(
  input: CreateListingInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };

  if (input.photoDataUrls.length < 3) return { ok: false, error: 'En az 3 fotoğraf gerekli.' };

  // MH-15: validate lat/lng (reject NaN/Infinity/out-of-range).
  const lat = sanitizeLat(input.lat);
  const lng = sanitizeLng(input.lng);
  if (lat === null || lng === null || lat === 0 || lng === 0) {
    return { ok: false, error: 'Konumu işaretle.' };
  }

  // Basic numeric guards (MH-15-adjacent: reject NaN on price/area).
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { ok: false, error: 'Fiyat pozitif olmalı.' };
  }
  if (!Number.isFinite(input.netArea) || input.netArea <= 0) {
    return { ok: false, error: 'Net m² pozitif olmalı.' };
  }
  if (!Number.isFinite(input.grossArea) || input.grossArea <= 0) {
    return { ok: false, error: 'Brüt m² pozitif olmalı.' };
  }

  // MH-09: sanitize all user-supplied text fields before storage.
  const safeDescription = sanitizeText(input.description, { maxLength: 10_000 });
  const safeAddress = sanitizeText(input.address, { maxLength: 500 });
  const safeNeighborhood = input.neighborhood
    ? sanitizeText(input.neighborhood, { maxLength: 200 })
    : undefined;
  const safeCity = sanitizeText(input.city, { maxLength: 100 });
  const safeDistrict = sanitizeText(input.district, { maxLength: 100 });
  if (!safeCity || !safeDistrict) return { ok: false, error: 'Şehir/ilçe gerekli.' };

  try {
    // 1) Foto'ları işle — URL ise olduğu gibi al, data URL ise upload et
    const uploadedPhotos = await Promise.all(
      input.photoDataUrls.map((d, i) =>
        d.startsWith('http') ? d : uploadDataUrl(d, 'listings', `photo-${i + 1}.jpg`),
      ),
    );

    // 2) Video varsa upload et
    let videoUrl: string | undefined;
    if (input.coverKind === 'video' && input.coverVideoDataUrl) {
      videoUrl = await uploadDataUrl(input.coverVideoDataUrl, 'listings', 'cover.mp4');
    }

    // 3) Score hesapla
    const score = shortScore({ lat, lng, price: input.price, netArea: input.netArea });

    // 4) Slug (unique)
    const base = slugify(`${safeCity}-${safeDistrict}-${input.rooms}-${input.type}`);
    let slug = base;
    let suffix = 1;
    while ((await db.select({ id: s.listings.id }).from(s.listings).where(eq(s.listings.slug, slug)).limit(1)).length > 0) {
      slug = `${base}-${suffix++}`;
    }

    const title = `${safeCity} ${safeDistrict} ${input.rooms} ${input.purpose === 'sale' ? 'Satılık' : 'Kiralık'}`;
    const regionDiger = Math.max(0, 100 - (input.region.aile + input.region.memur + input.region.ogrenci + input.region.yabanci));

    // 5) DB insert. MC-19: ALL new listings start as 'pending'. Premium just gets queue priority.
    const [created] = await db.insert(s.listings).values({
      slug,
      title,
      description: safeDescription,
      type: input.type,
      purpose: input.purpose,
      tier: input.tier,
      country: input.country,
      city: safeCity,
      district: safeDistrict,
      neighborhood: safeNeighborhood,
      address: safeAddress,
      lat,
      lng,
      price: input.price,
      currency: input.currency,
      netArea: input.netArea,
      grossArea: input.grossArea,
      rooms: input.rooms,
      bathrooms: input.bathrooms,
      floor: input.floor,
      totalFloors: input.totalFloors,
      buildingAge: input.buildingAge,
      heating: input.heating,
      parking: input.parking,
      images: uploadedPhotos,
      video: videoUrl,
      coverKind: input.coverKind,
      coverSrc: input.coverKind === 'video' ? (videoUrl ?? null) : uploadedPhotos[input.coverPhotoIndex] ?? uploadedPhotos[0],
      scoreTotal: score,
      scoreRegion: score,
      scorePrice: score,
      scoreRentYield: score,
      scoreDemand: score,
      scoreReasoning: 'İlk değerlendirme — yayın sonrası AI tarafından güncellenir.',
      regionProfile: {
        aile: input.region.aile,
        memur: input.region.memur,
        ogrenci: input.region.ogrenci,
        yabanci: input.region.yabanci,
        diger: regionDiger,
      },
      nearby: buildNearbyFromInput(input.nearby),
      // Günlük kira (PR5)
      dailyRentalEnabled: input.dailyRentalEnabled ?? false,
      dailyRentalPricePerNight: input.dailyRentalEnabled ? (input.dailyRentalPricePerNight ?? null) : null,
      dailyRentalCurrency: input.dailyRentalEnabled ? (input.dailyRentalCurrency ?? null) : null,
      dailyRentalMinNights: input.dailyRentalMinNights ?? 1,
      dailyRentalNotes: input.dailyRentalEnabled ? (input.dailyRentalNotes ?? null) : null,
      // MC-19: force pending for ALL tiers; premium only gets prioritized queue position.
      approvalStatus: 'pending',
      istbakuApproved: false,
      approvalLevel: 0,
      aiVerified: false,
      isPrivate: false,
      agentId: user.id,
      publishedAt: new Date(),
    }).returning();

    // 6) Approval queue for ALL new listings (premium gets higher AI score → surfaces first)
    await db.insert(s.approvalRequests).values({
      listingId: created.id,
      submittedById: user.id,
      type: 'new_listing',
      aiQualityScore: input.tier === 'premium' ? 90 : input.tier === 'guclu' ? 80 : 70,
      aiFlags: [],
      status: 'pending',
    });

    // 7) Audit
    await db.insert(s.auditLog).values({
      actorId: user.id,
      actorEmail: user.email,
      action: 'İlan oluşturuldu',
      target: `${created.slug} (${created.id})`,
      meta: { tier: input.tier, price: input.price, currency: input.currency },
    });

    return { ok: true, slug: created.slug };
  } catch (err) {
    console.error('createListing error', err);
    return { ok: false, error: 'İlan oluşturulamadı. Lütfen tekrar dene.' };
  }
}

export async function getMyListings() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(s.listings)
    .where(and(eq(s.listings.agentId, user.id), isNull(s.listings.deletedAt)))
    .orderBy(sql`${s.listings.publishedAt} DESC`);
}

export async function getEditableListing(idOrSlug: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const [row] = await db.select().from(s.listings)
    .where(and(
      isUuid ? eq(s.listings.id, idOrSlug) : eq(s.listings.slug, idOrSlug),
      isNull(s.listings.deletedAt),
    ))
    .limit(1);
  if (!row) return null;
  if (row.agentId !== user.id && user.role !== 'admin' && user.role !== 'super_admin') return null;
  return row;
}

/**
 * MC-07: Strict whitelist of user-patchable fields. Privileged fields
 * (approvalStatus, istbakuApproved, agentId, tier, approvalLevel, aiVerified,
 * isPrivate, views, favoritesCount, deletedAt) are intentionally excluded —
 * those go through dedicated admin actions.
 */
export interface UpdateListingInput {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  currency?: 'USD' | 'EUR' | 'TRY' | 'AZN';
  status?: 'bos' | 'kiracili' | 'mulk_sahibi';
}

// Approval-impacting fields: editing these re-queues the listing (MH-07).
const APPROVAL_IMPACTING_KEYS = ['title', 'description', 'price'] as const;

// PF-07: callers (EditListingForm) need to know when a save triggered a
// re-approval round-trip so they can surface a toast + inline banner.
export async function updateListingAction(input: UpdateListingInput): Promise<{ ok: boolean; error?: string; requeued?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  const target = await getEditableListing(input.id);
  if (!target) return { ok: false, error: 'İlan bulunamadı veya yetkin yok.' };

  // MC-07: build patch from the strict whitelist only.
  const patch: Partial<typeof s.listings.$inferInsert> = { updatedAt: new Date() };
  let touchedApprovalImpacting = false;

  if (input.title !== undefined) {
    const t = sanitizeText(input.title, { maxLength: 200 });
    if (!t) return { ok: false, error: 'Başlık boş olamaz.' };
    patch.title = t;
    touchedApprovalImpacting = true;
  }
  if (input.description !== undefined) {
    patch.description = sanitizeText(input.description, { maxLength: 10_000 });
    touchedApprovalImpacting = true;
  }
  if (input.price !== undefined) {
    if (!Number.isFinite(input.price) || input.price <= 0) {
      return { ok: false, error: 'Fiyat pozitif olmalı.' };
    }
    patch.price = input.price;
    touchedApprovalImpacting = true;
  }
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.status !== undefined) patch.status = input.status;

  // MH-07: if the listing was already approved and a substantive field changed,
  // requeue for re-approval. Premium/standard alike.
  let requeued = false;
  if (
    touchedApprovalImpacting &&
    target.approvalStatus === 'approved' &&
    APPROVAL_IMPACTING_KEYS.some((k) => (input as unknown as Record<string, unknown>)[k] !== undefined)
  ) {
    patch.approvalStatus = 'pending';
    patch.istbakuApproved = false;
    requeued = true;
  }

  try {
    await db.update(s.listings).set(patch).where(eq(s.listings.id, input.id));

    if (requeued) {
      // Create a new approval request reflecting the edit.
      await db.insert(s.approvalRequests).values({
        listingId: input.id,
        submittedById: user.id,
        type: input.price !== undefined ? 'price_change' : 'edit',
        aiQualityScore: 75,
        aiFlags: [],
        status: 'pending',
      });
    }

    await db.insert(s.auditLog).values({
      actorId: user.id, actorEmail: user.email,
      action: requeued ? 'İlan güncellendi (yeniden onaya alındı)' : 'İlan güncellendi',
      target: input.id,
      meta: { ...patch, requeued } as unknown as Record<string, unknown>,
    });
    // PF-07: surface the requeue decision so the edit UI can show a banner.
    return { ok: true, requeued };
  } catch (err) {
    console.error('updateListing', err);
    return { ok: false, error: 'Güncellenemedi.' };
  }
}

/**
 * MC-30: Soft delete. Sets deletedAt + deletedBy; queries must filter on
 * isNull(listings.deletedAt) to hide soft-deleted rows.
 */
export async function deleteListingAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  const target = await getEditableListing(id);
  if (!target) return { ok: false, error: 'İlan bulunamadı veya yetkin yok.' };
  try {
    await db.update(s.listings).set({
      deletedAt: new Date(),
      deletedBy: user.id,
      // Also remove from public visibility immediately.
      approvalStatus: 'rejected',
      updatedAt: new Date(),
    }).where(eq(s.listings.id, id));
    await db.insert(s.auditLog).values({
      actorId: user.id, actorEmail: user.email,
      action: 'İlan silindi (soft)', target: id,
    });
    return { ok: true };
  } catch (err) {
    console.error('deleteListing', err);
    return { ok: false, error: 'Silinemedi.' };
  }
}

/**
 * MC-08: Premium payment is gated. Without a configured payment provider key
 * the action refuses to upgrade. When a real provider is integrated, the
 * webhook handler should mark the payment row as 'paid' and flip the tier.
 *
 * TODO(payments): integrate Stripe / Iyzico:
 *   1. Create PaymentIntent via provider SDK using `amount` + `currency`.
 *   2. Return checkout URL to client; do NOT mutate listing.tier yet.
 *   3. Webhook handler at /api/webhooks/<provider> verifies signature, looks up
 *      payment row by providerRef, then atomically: payments.status='paid',
 *      listings.tier=<requested>, approvalStatus='pending' (premium → queue).
 */
export async function upgradeTierAction(
  id: string,
  tier: 'guclu' | 'premium',
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  const target = await getEditableListing(id);
  if (!target) return { ok: false, error: 'İlan bulunamadı.' };

  // MC-08: gate — no real provider configured → refuse (unless mock mode).
  const providerKey = process.env.PAYMENT_PROVIDER_KEY;
  if (!providerKey) {
    return { ok: false, error: 'PAYMENT_NOT_CONFIGURED' };
  }

  const amount = tier === 'premium' ? 2900 : 900;
  try {
    // Record an unresolved payment row; provider webhook flips status to 'paid'.
    const [payment] = await db.insert(s.payments).values({
      userId: user.id,
      listingId: id,
      amount,
      currency: 'USD',
      type: 'tier_upgrade',
      status: 'pending',
      providerRef: `pending-${Date.now()}`,
    }).returning();

    await db.insert(s.auditLog).values({
      actorId: user.id, actorEmail: user.email,
      action: `Tier yükseltme talebi (${tier})`,
      target: id,
      meta: { amount, currency: 'USD', paymentId: payment.id, status: 'pending' },
    });

    // Mock mode: immediately confirm payment
    if (providerKey === 'mock') {
      const confirmResult = await confirmPayment(payment.id);
      if (!confirmResult.ok) {
        return { ok: false, error: confirmResult.error };
      }
      return { ok: true };
    }

    // Real provider: send "talep alindi" email and wait for webhook
    sendEmail({
      to: user.email,
      subject: `Ödeme talebi alındı — ${tier === 'premium' ? 'Premium' : 'Güçlü'} ilan`,
      html: tplPaymentReceipt({
        name: user.name,
        amount,
        currency: 'USD',
        type: tier === 'premium' ? 'Premium ilan yükseltme (30 gün) — beklemede' : 'Güçlü ilan yükseltme (30 gün) — beklemede',
        listingTitle: target.title,
        receiptUrl: `${APP_URL}/dashboard?tab=listings`,
      }),
      silent: true,
    }).catch((e) => console.warn('[payment mail]', e));

    return { ok: true };
  } catch (err) {
    console.error('upgradeTier', err);
    return { ok: false, error: 'Yükseltme başarısız.' };
  }
}

// Saved searches
export async function createSavedSearchAction(name: string, filters: Record<string, unknown>): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  const safeName = sanitizeText(name, { maxLength: 120 });
  if (!safeName) return { ok: false, error: 'İsim gerekli.' };
  try {
    const [row] = await db.insert(s.savedSearches).values({ userId: user.id, name: safeName, filters }).returning();
    return { ok: true, id: row.id };
  } catch (err) {
    console.error('saveSearch', err);
    return { ok: false, error: 'Kaydedilemedi.' };
  }
}

export async function getMySavedSearchesAction() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(s.savedSearches)
    .where(eq(s.savedSearches.userId, user.id))
    .orderBy(sql`${s.savedSearches.createdAt} DESC`);
}

export async function deleteSavedSearchAction(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await db.delete(s.savedSearches)
    .where(and(eq(s.savedSearches.id, id), eq(s.savedSearches.userId, user.id)));
  return { ok: true };
}

export async function getMyPayments() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select({
    id: s.payments.id,
    amount: s.payments.amount,
    currency: s.payments.currency,
    type: s.payments.type,
    status: s.payments.status,
    createdAt: s.payments.createdAt,
  }).from(s.payments)
    .where(eq(s.payments.userId, user.id))
    .orderBy(sql`${s.payments.createdAt} DESC`);
}
