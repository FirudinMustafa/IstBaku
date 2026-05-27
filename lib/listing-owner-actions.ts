'use server';

import { db } from '@/db/client';
import { listings, payments, approvalRequests, notifications, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { revalidatePath } from 'next/cache';
import { confirmPayment } from './payment-confirm';

// ============================================================
// LISTING OWNER ACTIONS
// ============================================================

/**
 * Renew listing date — bumps publishedAt so the listing appears fresh in
 * chronological feeds. Creates a pending payment record ($19).
 */
export async function renewListingDateAction(
  listingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };

  try {
    // Verify ownership
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) return { ok: false, error: 'İlan bulunamadı.' };
    if (listing.agentId !== user.id) return { ok: false, error: 'Bu ilan sana ait değil.' };

    // Create payment record (pending)
    const [paymentRow] = await db.insert(payments).values({
      userId: user.id,
      listingId,
      type: 'date_renewal',
      amount: 1900,
      currency: 'USD',
      status: 'pending',
    }).returning();

    // Mock confirmation — immediately confirm the payment.
    // When a real provider is integrated, this call is removed and the
    // provider webhook calls confirmPayment instead.
    const confirmResult = await confirmPayment(paymentRow.id);
    if (!confirmResult.ok) {
      return { ok: false, error: confirmResult.error };
    }

    revalidatePath('/dashboard');
    revalidatePath(`/property/${listing.slug}`);

    return { ok: true };
  } catch (err) {
    console.error('renewListingDate error', err);
    return { ok: false, error: 'Tarih yenileme başarısız. Lütfen tekrar dene.' };
  }
}

/**
 * Request premium (istbakuApproved) upgrade — sets tier to 'premium' and
 * creates an approval request for admin review. The istbakuApproved flag
 * is NOT flipped here; admin decides after reviewing the request.
 */
export async function requestPremiumUpgradeAction(
  listingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };

  try {
    // Verify ownership
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) return { ok: false, error: 'İlan bulunamadı.' };
    if (listing.agentId !== user.id) return { ok: false, error: 'Bu ilan sana ait değil.' };
    if (listing.istbakuApproved) return { ok: false, error: 'Bu ilan zaten IstBaku onaylı.' };

    // Create payment record ($49) — pending
    const [paymentRow] = await db.insert(payments).values({
      userId: user.id,
      listingId,
      type: 'istbaku_approved',
      amount: 4900,
      currency: 'USD',
      status: 'pending',
    }).returning();

    // Create approval request (admin will decide on istbakuApproved after payment)
    await db.insert(approvalRequests).values({
      listingId,
      submittedById: user.id,
      type: 'tier_upgrade',
      aiQualityScore: 0,
      aiFlags: [],
      status: 'pending',
    });

    // Mock confirmation — immediately confirm the payment.
    const confirmResult = await confirmPayment(paymentRow.id);
    if (!confirmResult.ok) {
      return { ok: false, error: confirmResult.error };
    }

    revalidatePath('/dashboard');
    revalidatePath(`/property/${listing.slug}`);

    return { ok: true };
  } catch (err) {
    console.error('requestPremiumUpgrade error', err);
    return { ok: false, error: 'Premium başvurusu başarısız. Lütfen tekrar dene.' };
  }
}

/**
 * Convert a listing to private portfolio — requires approved KYC and
 * listing price >= 500,000 (500K).
 */
export async function convertToPrivateAction(
  listingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };

  try {
    // Verify ownership
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) return { ok: false, error: 'İlan bulunamadı.' };
    if (listing.agentId !== user.id) return { ok: false, error: 'Bu ilan sana ait değil.' };

    // Check KYC status
    const [dbUser] = await db
      .select({ kycStatus: users.kycStatus })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || dbUser.kycStatus !== 'approved') {
      return { ok: false, error: 'Gizli portföy için KYC onayı gerekli.' };
    }

    // Check price threshold (currency-normalized)
    // Approximate thresholds: 500K USD/EUR base, adjusted for TRY and AZN.
    const PRIVATE_PRICE_THRESHOLDS: Record<string, number> = {
      USD: 500_000,
      EUR: 500_000,
      TRY: 500_000 * 35,   // ~17.5M TRY
      AZN: 500_000 * 1.7,  // ~850K AZN
    };
    const threshold = PRIVATE_PRICE_THRESHOLDS[listing.currency] ?? 500_000;
    if (listing.price < threshold) {
      return {
        ok: false,
        error: `Gizli portföy için ilan fiyatı en az ${threshold.toLocaleString('tr-TR')} ${listing.currency} olmalı.`,
      };
    }

    // Set listing as private
    await db
      .update(listings)
      .set({
        isPrivate: true,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId));

    // Notify the user
    await db.insert(notifications).values({
      userId: user.id,
      type: 'system',
      title: 'Gizli Portföy',
      body: 'İlanın gizli portföye eklendi',
      link: `/property/${listing.slug}`,
    });

    revalidatePath('/dashboard');
    revalidatePath(`/property/${listing.slug}`);

    return { ok: true };
  } catch (err) {
    console.error('convertToPrivate error', err);
    return { ok: false, error: 'Gizli portföye ekleme başarısız. Lütfen tekrar dene.' };
  }
}
