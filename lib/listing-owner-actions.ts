'use server';

import { db } from '@/db/client';
import { listings, payments, notifications, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { getPrice } from './pricing';
import { maybeStartCheckout } from './payment-provider';
import { revalidatePath } from 'next/cache';

// ============================================================
// LISTING OWNER ACTIONS
// ============================================================

/** Bekleyen (pending) ödeme oluşturulduğunda dönen tip — istemci ödeme
 *  penceresini bu bilgilerle açar, ödeme onayını mock-confirm ucu yapar.
 *  NOT: 'use server' modülü yalnızca async fonksiyon export edebildiği için
 *  tip ve sabitler bu dosyada local tutulur (export edilmez). */
type PendingPaymentResult =
  | { ok: true; paymentId: string; amount: number; currency: 'USD'; checkoutUrl?: string }
  | { ok: false; error: string };

/**
 * Renew listing date — ücretli ($19). Bekleyen ödeme kaydı oluşturur ve
 * paymentId döndürür; ödeme penceresinde onaylanınca confirmPayment
 * publishedAt'i tazeler. (Eskiden otomatik onaylanıyordu.)
 */
export async function renewListingDateAction(
  listingId: string,
): Promise<PendingPaymentResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };

  try {
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) return { ok: false, error: 'İlan bulunamadı.' };
    if (listing.agentId !== user.id) return { ok: false, error: 'Bu ilan sana ait değil.' };

    const amount = await getPrice('date_renewal');
    const [paymentRow] = await db.insert(payments).values({
      userId: user.id,
      listingId,
      type: 'date_renewal',
      amount,
      currency: 'USD',
      status: 'pending',
    }).returning();

    const checkoutUrl = await maybeStartCheckout({
      paymentId: paymentRow.id, amount, currency: 'USD', description: 'İlan tarih yenileme',
    });
    return { ok: true, paymentId: paymentRow.id, amount, currency: 'USD', checkoutUrl };
  } catch (err) {
    console.error('renewListingDate error', err);
    return { ok: false, error: 'Tarih yenileme başarısız. Lütfen tekrar dene.' };
  }
}

/**
 * Request premium (istbakuApproved) upgrade — ücretli ($49). Bekleyen ödeme +
 * admin onay talebi oluşturur; ödeme penceresinde onaylanınca confirmPayment
 * tier'i premium yapar. istbakuApproved bayrağını admin kararı flipler.
 */
export async function requestPremiumUpgradeAction(
  listingId: string,
): Promise<PendingPaymentResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };

  try {
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) return { ok: false, error: 'İlan bulunamadı.' };
    if (listing.agentId !== user.id) return { ok: false, error: 'Bu ilan sana ait değil.' };
    if (listing.istbakuApproved) return { ok: false, error: 'Bu ilan zaten İstBaku onaylı.' };

    const amount = await getPrice('istbaku_badge');
    const [paymentRow] = await db.insert(payments).values({
      userId: user.id,
      listingId,
      type: 'istbaku_approved',
      amount,
      currency: 'USD',
      status: 'pending',
    }).returning();

    // Madde 4 fix: admin onay talebi ödeme onaylanınca (confirmPayment) oluşturulur,
    // burada DEĞİL — aksi halde ödeme yapılmasa bile admin panele düşüyordu.

    const checkoutUrl = await maybeStartCheckout({
      paymentId: paymentRow.id, amount, currency: 'USD', description: 'İstBaku Onaylı rozet',
    });
    return { ok: true, paymentId: paymentRow.id, amount, currency: 'USD', checkoutUrl };
  } catch (err) {
    console.error('requestPremiumUpgrade error', err);
    return { ok: false, error: 'Premium başvurusu başarısız. Lütfen tekrar dene.' };
  }
}

/**
 * İlan sihirbazı sonunda seçilen ücretli eklentiler (rozet ve/veya gizli) için
 * TEK birleşik bekleyen ödeme oluşturur ve paymentId döndürür. Ödeme penceresi
 * onaylayınca: rozet → confirmPayment tier'i premium yapar; gizli →
 * applyWizardPrivateAction ile uygulanır.
 */
export async function createWizardExtrasPaymentAction(
  listingId: string,
  opts: { badge: boolean; gizli: boolean },
): Promise<PendingPaymentResult | { ok: true; none: true }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  if (!opts.badge && !opts.gizli) return { ok: true, none: true };

  try {
    const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
    if (!listing) return { ok: false, error: 'İlan bulunamadı.' };
    if (listing.agentId !== user.id) return { ok: false, error: 'Bu ilan sana ait değil.' };

    const [badgePrice, privatePrice] = await Promise.all([
      getPrice('istbaku_badge'),
      getPrice('private'),
    ]);
    const amount = (opts.badge ? badgePrice : 0) + (opts.gizli ? privatePrice : 0);
    // Rozet varsa istbaku_approved (confirmPayment premium yapar); yoksa
    // premium_membership (gizli-only — listing mutasyonu applyWizardPrivate ile).
    const type = opts.badge ? ('istbaku_approved' as const) : ('premium_membership' as const);

    const [paymentRow] = await db.insert(payments).values({
      userId: user.id,
      listingId,
      type,
      amount,
      currency: 'USD',
      status: 'pending',
    }).returning();

    // Madde 4 fix: rozet (tier_upgrade) onay talebi ödeme onaylanınca confirmPayment
    // içinde oluşturulur — burada DEĞİL. Böylece ödeme yapılmadan admin panele
    // ikinci kart düşmez.

    const checkoutUrl = await maybeStartCheckout({
      paymentId: paymentRow.id, amount, currency: 'USD', description: 'İlan eklentileri',
    });
    return { ok: true, paymentId: paymentRow.id, amount, currency: 'USD', checkoutUrl };
  } catch (err) {
    console.error('createWizardExtrasPayment error', err);
    return { ok: false, error: 'Ödeme başlatılamadı. Lütfen tekrar dene.' };
  }
}

/**
 * Ödeme onaylandıktan sonra ilanı gizli portföye alır (KYC + fiyat eşiği
 * kontrolüyle). Sihirbazın ödeme penceresi başarıyla kapanınca çağrılır.
 */
export async function applyWizardPrivateAction(
  listingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return convertToPrivateAction(listingId);
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
