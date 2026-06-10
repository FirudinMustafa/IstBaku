'use server';

import { db } from '@/db/client';
import { agents, users, listings, abuseReports, agentMonthlyMetrics } from '@/db/schema';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { getCurrentUser, getAdminOrRole } from './auth-actions';
import { evaluateOffice, type OfficeStats, type OfficeTier } from './office-metrics';

/** Geçerli ay anahtarı 'YYYY-MM'. */
function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Bir ajan için ham ölçüleri DB'den toplar. */
async function gatherStats(agent: {
  userId: string; rating: number; responseMins: number; verified: boolean;
}): Promise<OfficeStats> {
  const rows = await db
    .select({
      id: listings.id,
      images: listings.images,
      video: listings.video,
      has360: listings.has360,
      description: listings.description,
    })
    .from(listings)
    .where(and(eq(listings.agentId, agent.userId), eq(listings.approvalStatus, 'approved'), isNull(listings.deletedAt)));

  const total = rows.length;
  const sumPhotos = rows.reduce((a, r) => a + (Array.isArray(r.images) ? r.images.length : 0), 0);
  const sumDesc = rows.reduce((a, r) => a + (r.description?.length ?? 0), 0);
  const withVideo = rows.filter((r) => !!r.video && r.video.trim() !== '').length;
  const with360 = rows.filter((r) => r.has360).length;

  let openComplaints = 0;
  if (total > 0) {
    const ids = rows.map((r) => r.id);
    const [cRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(abuseReports)
      .where(and(
        eq(abuseReports.targetType, 'listing'),
        inArray(abuseReports.targetId, ids),
        inArray(abuseReports.status, ['open', 'reviewing']),
      ));
    openComplaints = cRow?.c ?? 0;
  }

  return {
    activeListings: total,
    avgRating: agent.rating ?? 0,
    responseMins: agent.responseMins ?? 0,
    verified: !!agent.verified,
    avgPhotoCount: total ? sumPhotos / total : 0,
    avgDescLen: total ? sumDesc / total : 0,
    videoRatio: total ? withVideo / total : 0,
    tour360Ratio: total ? with360 / total : 0,
    complaintRatio: total ? openComplaints / total : 0,
    // Satış/kira ile "kapanma" için ayrı durum henüz yok → şimdilik 0.
    // (İleride ilanlara 'sold/closed' durumu eklenince buradan beslenecek.)
    soldClosedCount: 0,
  };
}

/**
 * Tüm ofislerin (ajanların) bu ayki metriklerini hesaplar ve upsert eder.
 * Admin tetikler; aylık cron da çağırabilir.
 */
export async function recomputeOfficeMetricsAction(
  opts?: { adminBypass?: boolean },
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!opts?.adminBypass) {
    const admin = await getAdminOrRole();
    if (!admin) return { ok: false, error: 'Yetkisiz.' };
  }
  try {
    const ym = currentYearMonth();
    const ags = await db
      .select({ userId: agents.userId, rating: agents.rating, responseMins: agents.responseMins, verified: agents.verified })
      .from(agents);

    let count = 0;
    for (const a of ags) {
      const stats = await gatherStats(a);
      const { criteriaMet, tier } = evaluateOffice(stats);
      await db
        .insert(agentMonthlyMetrics)
        .values({
          agentId: a.userId,
          yearMonth: ym,
          activeListings: stats.activeListings,
          videoRatio: stats.videoRatio,
          tour360Ratio: stats.tour360Ratio,
          avgPhotoCount: stats.avgPhotoCount,
          avgReviewRating: stats.avgRating,
          complaintRatio: stats.complaintRatio,
          avgResponseMins: Math.round(stats.responseMins),
          soldClosedCount: stats.soldClosedCount,
          criteriaMet,
          tier,
        })
        .onConflictDoUpdate({
          target: [agentMonthlyMetrics.agentId, agentMonthlyMetrics.yearMonth],
          set: {
            activeListings: stats.activeListings,
            videoRatio: stats.videoRatio,
            tour360Ratio: stats.tour360Ratio,
            avgPhotoCount: stats.avgPhotoCount,
            avgReviewRating: stats.avgRating,
            complaintRatio: stats.complaintRatio,
            avgResponseMins: Math.round(stats.responseMins),
            soldClosedCount: stats.soldClosedCount,
            criteriaMet,
            tier,
            computedAt: new Date(),
          },
        });
      count++;
    }
    return { ok: true, count };
  } catch (err) {
    console.error('recomputeOfficeMetrics error', err);
    return { ok: false, error: 'Hesaplama başarısız.' };
  }
}

export interface OfficeMetricRow {
  agentId: string;
  name: string;
  email: string;
  agency: string | null;
  yearMonth: string | null;
  tier: OfficeTier;
  criteriaMet: number[];
  activeListings: number;
  videoRatio: number;
  tour360Ratio: number;
  avgPhotoCount: number;
  avgReviewRating: number;
  complaintRatio: number;
  avgResponseMins: number;
  soldClosedCount: number;
}

/** Admin: tüm ofislerin en güncel metrikleri. */
export async function getAllOfficeMetrics(): Promise<OfficeMetricRow[]> {
  const ym = currentYearMonth();
  const rows = await db
    .select({
      agentId: agents.userId,
      name: users.name,
      email: users.email,
      agency: agents.agency,
      yearMonth: agentMonthlyMetrics.yearMonth,
      tier: agentMonthlyMetrics.tier,
      criteriaMet: agentMonthlyMetrics.criteriaMet,
      activeListings: agentMonthlyMetrics.activeListings,
      videoRatio: agentMonthlyMetrics.videoRatio,
      tour360Ratio: agentMonthlyMetrics.tour360Ratio,
      avgPhotoCount: agentMonthlyMetrics.avgPhotoCount,
      avgReviewRating: agentMonthlyMetrics.avgReviewRating,
      complaintRatio: agentMonthlyMetrics.complaintRatio,
      avgResponseMins: agentMonthlyMetrics.avgResponseMins,
      soldClosedCount: agentMonthlyMetrics.soldClosedCount,
    })
    .from(agents)
    .innerJoin(users, eq(users.id, agents.userId))
    .leftJoin(
      agentMonthlyMetrics,
      and(eq(agentMonthlyMetrics.agentId, agents.userId), eq(agentMonthlyMetrics.yearMonth, ym)),
    );

  return rows.map((r) => ({
    agentId: r.agentId,
    name: r.name,
    email: r.email,
    agency: r.agency,
    yearMonth: r.yearMonth,
    tier: (r.tier ?? 'none') as OfficeTier,
    criteriaMet: r.criteriaMet ?? [],
    activeListings: r.activeListings ?? 0,
    videoRatio: r.videoRatio ?? 0,
    tour360Ratio: r.tour360Ratio ?? 0,
    avgPhotoCount: r.avgPhotoCount ?? 0,
    avgReviewRating: r.avgReviewRating ?? 0,
    complaintRatio: r.complaintRatio ?? 0,
    avgResponseMins: r.avgResponseMins ?? 0,
    soldClosedCount: r.soldClosedCount ?? 0,
  }));
}

/** Ajan: kendi en güncel metriği (yoksa anlık hesaplanır, kaydedilmez). */
export async function getMyOfficeMetrics(): Promise<OfficeMetricRow | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [a] = await db
    .select({ userId: agents.userId, rating: agents.rating, responseMins: agents.responseMins, verified: agents.verified, agency: agents.agency })
    .from(agents)
    .where(eq(agents.userId, user.id))
    .limit(1);
  if (!a) return null;

  const ym = currentYearMonth();
  // Tablo henüz oluşturulmadıysa (migration uygulanmadan) sorgu hata verebilir;
  // bu durumda anlık hesaplamaya düşeriz (mevcut tablolardan).
  let existing: typeof agentMonthlyMetrics.$inferSelect | undefined;
  try {
    [existing] = await db
      .select()
      .from(agentMonthlyMetrics)
      .where(and(eq(agentMonthlyMetrics.agentId, user.id), eq(agentMonthlyMetrics.yearMonth, ym)))
      .limit(1);
  } catch {
    existing = undefined;
  }

  if (existing) {
    return {
      agentId: user.id, name: user.name, email: user.email, agency: a.agency,
      yearMonth: existing.yearMonth, tier: existing.tier as OfficeTier, criteriaMet: existing.criteriaMet ?? [],
      activeListings: existing.activeListings, videoRatio: existing.videoRatio, tour360Ratio: existing.tour360Ratio,
      avgPhotoCount: existing.avgPhotoCount, avgReviewRating: existing.avgReviewRating, complaintRatio: existing.complaintRatio,
      avgResponseMins: existing.avgResponseMins, soldClosedCount: existing.soldClosedCount,
    };
  }

  // Henüz hesaplanmamış → anlık hesapla (kaydetmeden göster).
  const stats = await gatherStats(a);
  const { criteriaMet, tier } = evaluateOffice(stats);
  return {
    agentId: user.id, name: user.name, email: user.email, agency: a.agency,
    yearMonth: null, tier, criteriaMet,
    activeListings: stats.activeListings, videoRatio: stats.videoRatio, tour360Ratio: stats.tour360Ratio,
    avgPhotoCount: stats.avgPhotoCount, avgReviewRating: stats.avgRating, complaintRatio: stats.complaintRatio,
    avgResponseMins: Math.round(stats.responseMins), soldClosedCount: stats.soldClosedCount,
  };
}
