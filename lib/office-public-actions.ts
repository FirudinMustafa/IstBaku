'use server';

import { db } from '@/db/client';
import { users, agents, reviews, listings } from '@/db/schema';
import { and, eq, desc, isNull, sql } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { rowToProperty, rowsToAgent } from './db-mappers';
import { stripCrlf } from './security';
import type { Agent, Property } from './types';

export interface OfficeReview {
  id: string;
  authorName: string;
  authorAvatar: string | null;
  rating: number;
  text: string;
  createdAt: string;
}

export interface OfficeProfile {
  agent: Agent;
  listings: Property[];
  reviews: OfficeReview[];
  ratingAvg: number;
  reviewCount: number;
}

/** Ofis kontrolü: users.bio '[office]' içermeli. */
function isOfficeBio(bio: string | null): boolean {
  return (bio ?? '').includes('[office]');
}

/** Public ofis profilini (hakkımızda, ilanlar, onaylı yorumlar, puan) döndürür. */
export async function getOfficeProfile(userId: string): Promise<OfficeProfile | null> {
  const [row] = await db
    .select({ user: users, agent: agents })
    .from(users)
    .innerJoin(agents, eq(users.id, agents.userId))
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);
  // Madde (tur3) #2: profil sayfası artık TÜM ajanlar için açık (ofis + bireysel).
  // agents tablosunda satırı olan herkes (ajan/ofis) profilini görüntüleyebilir.
  if (!row) return null;

  const agent = rowsToAgent(row.user, row.agent);

  const listingRows = await db
    .select()
    .from(listings)
    .where(and(
      eq(listings.agentId, userId),
      eq(listings.approvalStatus, 'approved'),
      eq(listings.isPrivate, false),
      isNull(listings.deletedAt),
    ))
    .orderBy(desc(listings.publishedAt))
    .limit(60);

  const reviewRows = await db
    .select({ r: reviews, authorName: users.name, authorAvatar: users.avatar })
    .from(reviews)
    .innerJoin(users, eq(reviews.authorUserId, users.id))
    .where(and(eq(reviews.agentUserId, userId), eq(reviews.status, 'approved')))
    .orderBy(desc(reviews.createdAt))
    .limit(100);

  const officeReviews: OfficeReview[] = reviewRows.map((x) => ({
    id: x.r.id,
    authorName: x.authorName,
    authorAvatar: x.authorAvatar,
    rating: x.r.rating,
    text: x.r.text,
    createdAt: x.r.createdAt.toISOString(),
  }));

  const reviewCount = officeReviews.length;
  const ratingAvg = reviewCount > 0
    ? Math.round((officeReviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
    : 0;

  return {
    agent,
    listings: listingRows.map(rowToProperty),
    reviews: officeReviews,
    ratingAvg,
    reviewCount,
  };
}

/** agents.rating + reviews_count'u onaylı yorumlardan yeniden hesaplar. */
async function recomputeAgentRating(agentUserId: string): Promise<void> {
  const [agg] = await db
    .select({ avg: sql<number>`coalesce(avg(${reviews.rating}), 0)`, cnt: sql<number>`count(*)` })
    .from(reviews)
    .where(and(eq(reviews.agentUserId, agentUserId), eq(reviews.status, 'approved')));
  await db.update(agents)
    .set({ rating: Math.round(Number(agg.avg) * 10) / 10, reviewsCount: Number(agg.cnt) })
    .where(eq(agents.userId, agentUserId));
}

/**
 * Bir ofise yorum + puan gönderir (giriş gerekli). Pending olarak kaydedilir;
 * admin onayından sonra public sayfada görünür. Bir kullanıcı bir ofise tek yorum.
 */
export async function submitReviewAction(input: {
  agentUserId: string;
  rating: number;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Yorum için giriş yapmalısın.' };
  if (user.id === input.agentUserId) return { ok: false, error: 'Kendi ofisine yorum yapamazsın.' };

  const rating = Math.round(input.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Puan 1 ile 5 arasında olmalı.' };
  }
  const text = stripCrlf(input.text ?? '').trim().slice(0, 1000);

  // Hedef gerçek bir ajan/ofis mi? (tur3 #2 — yorumlar tüm ajanlara açık)
  const [target] = await db
    .select({ userId: agents.userId })
    .from(agents)
    .innerJoin(users, eq(agents.userId, users.id))
    .where(and(eq(agents.userId, input.agentUserId), isNull(users.deletedAt)))
    .limit(1);
  if (!target) return { ok: false, error: 'Ajan bulunamadı.' };

  try {
    await db.insert(reviews)
      .values({ agentUserId: input.agentUserId, authorUserId: user.id, rating, text, status: 'pending' })
      .onConflictDoUpdate({
        target: [reviews.agentUserId, reviews.authorUserId],
        set: { rating, text, status: 'pending', createdAt: new Date() },
      });
    return { ok: true };
  } catch (err) {
    console.error('submitReview', err);
    return { ok: false, error: 'Yorum gönderilemedi.' };
  }
}

export interface OfficeDetails {
  officeCountry: string | null;
  taxId: string | null;
  companyName: string | null;
  authorizationNo: string | null;
  officeAddress: string | null;
  officeCity: string | null;
  officeDistrict: string | null;
  docs: { name: string; url: string }[];
}

/** Giriş yapan ofisin kayıt/KYC detaylarını döndürür (Madde 5/6). */
export async function getOfficeDetails(): Promise<OfficeDetails | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const [u] = await db.select({ bio: users.bio }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!u || !isOfficeBio(u.bio)) return null;
  const [a] = await db.select().from(agents).where(eq(agents.userId, user.id)).limit(1);
  if (!a) return null;
  return {
    officeCountry: a.officeCountry ?? null,
    taxId: a.taxId ?? null,
    companyName: a.companyName ?? null,
    authorizationNo: a.authorizationNo ?? null,
    officeAddress: a.officeAddress ?? null,
    officeCity: a.officeCity ?? null,
    officeDistrict: a.officeDistrict ?? null,
    docs: (a.officeDocs ?? []) as { name: string; url: string }[],
  };
}

/**
 * Ofis kayıt/KYC bilgilerini ve belge görsellerini kaydeder (Madde 5/6).
 * Belgeler önceden `/api/kyc/upload` ile yüklenip URL olarak gelir.
 */
export async function saveOfficeDetailsAction(input: {
  taxId?: string;
  companyName?: string;
  authorizationNo?: string;
  officeAddress?: string;
  officeCity?: string;
  officeDistrict?: string;
  docs?: { name: string; url: string }[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  const [u] = await db.select({ bio: users.bio }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!u || !isOfficeBio(u.bio)) return { ok: false, error: 'Bu özellik sadece ofis hesapları içindir.' };

  const clip = (s: string | undefined, n: number) => (s ? stripCrlf(s).trim().slice(0, n) || null : null);
  const docs = Array.isArray(input.docs)
    ? input.docs
        .filter((d) => d && typeof d.url === 'string' && /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(d.url))
        .slice(0, 20)
        .map((d) => ({ name: stripCrlf(d.name ?? '').trim().slice(0, 120), url: d.url }))
    : undefined;

  try {
    await db.update(agents).set({
      taxId: clip(input.taxId, 64),
      companyName: clip(input.companyName, 200),
      authorizationNo: clip(input.authorizationNo, 64),
      officeAddress: clip(input.officeAddress, 500),
      officeCity: clip(input.officeCity, 64),
      officeDistrict: clip(input.officeDistrict, 64),
      ...(docs ? { officeDocs: docs } : {}),
    }).where(eq(agents.userId, user.id));
    return { ok: true };
  } catch (err) {
    console.error('saveOfficeDetails', err);
    return { ok: false, error: 'Ofis bilgileri kaydedilemedi.' };
  }
}

/** Ofis kendi Hakkımızda metnini günceller (Madde 13). */
export async function updateOfficeAboutAction(
  about: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  const [u] = await db.select({ bio: users.bio }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!u || !isOfficeBio(u.bio)) return { ok: false, error: 'Bu özellik sadece ofis hesapları içindir.' };

  const clean = stripCrlf(about ?? '').trim().slice(0, 2000);
  try {
    await db.update(agents).set({ about: clean || null }).where(eq(agents.userId, user.id));
    return { ok: true };
  } catch (err) {
    console.error('updateOfficeAbout', err);
    return { ok: false, error: 'Hakkımızda güncellenemedi.' };
  }
}

export interface ModerationReview {
  id: string;
  agentUserId: string;
  officeName: string;
  authorName: string;
  rating: number;
  text: string;
  status: string;
  createdAt: string;
}

/** Admin: moderasyon için yorumları döndürür (varsayılan: bekleyenler). */
export async function getReviewsForModeration(
  status: 'pending' | 'approved' | 'rejected' = 'pending',
): Promise<ModerationReview[]> {
  const author = users;
  const rows = await db
    .select({
      id: reviews.id,
      agentUserId: reviews.agentUserId,
      authorName: author.name,
      rating: reviews.rating,
      text: reviews.text,
      status: reviews.status,
      createdAt: reviews.createdAt,
      officeName: agents.agency,
      officeUserName: sql<string>`(select name from users u2 where u2.id = ${reviews.agentUserId})`,
    })
    .from(reviews)
    .innerJoin(author, eq(reviews.authorUserId, author.id))
    .leftJoin(agents, eq(reviews.agentUserId, agents.userId))
    .where(eq(reviews.status, status))
    .orderBy(desc(reviews.createdAt))
    .limit(200);
  return rows.map((r) => ({
    id: r.id,
    agentUserId: r.agentUserId,
    officeName: r.officeName || r.officeUserName || '—',
    authorName: r.authorName,
    rating: r.rating,
    text: r.text,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Admin: yorumu onaylar/reddeder ve ofis puanını yeniden hesaplar. */
export async function moderateReviewAction(
  reviewId: string,
  decision: 'approved' | 'rejected',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'moderator')) {
    return { ok: false, error: 'Yetkin yok.' };
  }
  try {
    const [updated] = await db.update(reviews)
      .set({ status: decision })
      .where(eq(reviews.id, reviewId))
      .returning({ agentUserId: reviews.agentUserId });
    if (updated) await recomputeAgentRating(updated.agentUserId);
    return { ok: true };
  } catch (err) {
    console.error('moderateReview', err);
    return { ok: false, error: 'İşlem başarısız.' };
  }
}
