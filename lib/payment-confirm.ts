'use server';

import { db } from '@/db/client';
import { payments, listings, notifications, approvalRequests, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendEmail, tplPaymentReceipt, APP_URL } from './email';

/**
 * Shared payment confirmation logic.
 *
 * Called by:
 * - Mock confirmation API route (`/api/payments/mock-confirm`)
 * - Owner actions directly (for immediate mock confirmation)
 *
 * When a real payment provider is added, only the internals of this
 * function (or the caller path) need to change.
 */
export async function confirmPayment(
  paymentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // 1. Fetch payment
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) return { ok: false, error: 'Ödeme bulunamadı.' };
    if (payment.status === 'paid') return { ok: false, error: 'Bu ödeme zaten onaylanmış.' };

    // 2. Update payment status
    await db
      .update(payments)
      .set({
        status: 'paid',
        providerRef: `mock-${Date.now()}`,
      })
      .where(eq(payments.id, paymentId));

    // 3. Apply listing changes based on payment type
    if (payment.listingId) {
      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, payment.listingId))
        .limit(1);

      if (listing) {
        switch (payment.type) {
          case 'date_renewal':
            await db
              .update(listings)
              .set({
                publishedAt: new Date(),
                renewalCount: listing.renewalCount + 1,
                lastRenewedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(listings.id, payment.listingId));
            break;

          case 'istbaku_approved':
            await db
              .update(listings)
              .set({
                tier: 'premium',
                updatedAt: new Date(),
              })
              .where(eq(listings.id, payment.listingId));
            // Approval request should already exist (created by the owner action)
            break;

          case 'tier_upgrade': {
            // Determine tier based on amount: 900 = guclu, 2900 = premium
            const newTier = payment.amount >= 2900 ? 'premium' as const
              : payment.amount >= 900 ? 'guclu' as const
              : 'guclu' as const;
            await db
              .update(listings)
              .set({
                tier: newTier,
                updatedAt: new Date(),
              })
              .where(eq(listings.id, payment.listingId));
            break;
          }
        }
      }
    }

    // 4. Get user info for email + notification
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payment.userId))
      .limit(1);

    // 5. Create notification
    const typeLabels: Record<string, string> = {
      date_renewal: 'Tarih yenileme',
      istbaku_approved: 'Premium onay başvurusu',
      tier_upgrade: 'Tier yükseltme',
      premium_membership: 'Premium üyelik',
      report_purchase: 'Rapor satın alma',
      partner_commission: 'Partner komisyon',
    };

    await db.insert(notifications).values({
      userId: payment.userId,
      type: 'payment',
      title: 'Ödeme Onaylandı',
      body: `${typeLabels[payment.type] ?? payment.type} ödemeniz onaylandı — ${payment.amount} ${payment.currency}`,
      link: '/dashboard?tab=listings',
    });

    // 6. Send confirmation email
    if (user) {
      let listingTitle: string | undefined;
      if (payment.listingId) {
        const [l] = await db
          .select({ title: listings.title })
          .from(listings)
          .where(eq(listings.id, payment.listingId))
          .limit(1);
        if (l) listingTitle = l.title;
      }

      sendEmail({
        to: user.email,
        subject: `Ödeme onaylandı — ${typeLabels[payment.type] ?? payment.type}`,
        html: tplPaymentReceipt({
          name: user.name,
          amount: payment.amount,
          currency: payment.currency,
          type: `${typeLabels[payment.type] ?? payment.type} — onaylandı`,
          listingTitle,
          receiptUrl: `${APP_URL}/dashboard?tab=listings`,
        }),
        silent: true,
      }).catch((e) => console.warn('[payment-confirm mail]', e));
    }

    return { ok: true };
  } catch (err) {
    console.error('confirmPayment error', err);
    return { ok: false, error: 'Ödeme onaylama başarısız.' };
  }
}
