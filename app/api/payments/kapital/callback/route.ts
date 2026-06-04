import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { confirmPayment } from '@/lib/payment-confirm';
import { getKapitalOrder, parseKapitalRef, isPaidStatus } from '@/lib/kapital';
import { APP_URL } from '@/lib/email';

/**
 * GET /api/payments/kapital/callback?paymentId=<uuid>&ID=<bankOrderId>&STATUS=<...>
 *
 * Kapital Bank, kullanıcı HPP'de ödemeyi tamamladıktan sonra buraya yönlendirir.
 *
 * ÖNEMLİ: Bankanın gönderdiği STATUS parametresine GÜVENİLMEZ (dokümana göre
 * geçici olabilir). Bu yüzden GET /order/{id} ile durumu yeniden doğrularız.
 * Doğrulama başarılıysa confirmPayment() ödemeyi 'paid' yapar ve ilanı günceller.
 *
 * Sonuçta kullanıcı dashboard'a yönlendirilir (?payment=success|failed).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get('paymentId');

  const dashboard = (state: 'success' | 'failed' | 'pending') =>
    NextResponse.redirect(`${APP_URL}/dashboard?tab=listings&payment=${state}`);

  if (!paymentId) {
    return dashboard('failed');
  }

  try {
    // 1. Ödeme kaydını bul (banka order kimliği providerRef'e gömülü).
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) return dashboard('failed');
    // Zaten onaylanmışsa (örn. kullanıcı geri butonuna bastı) tekrar işleme.
    if (payment.status === 'paid') return dashboard('success');

    const ref = parseKapitalRef(payment.providerRef);
    if (!ref) return dashboard('failed');

    // 2. Bankadan gerçek durumu doğrula.
    const order = await getKapitalOrder(ref.orderId);

    if (!isPaidStatus(order.status)) {
      // Ödeme tamamlanmadı / reddedildi — pending bırak, kullanıcıyı bilgilendir.
      return dashboard('failed');
    }

    // 3. Doğrulandı → ödemeyi onayla (ilan güncelleme + bildirim + e-posta).
    const result = await confirmPayment(paymentId);
    return dashboard(result.ok ? 'success' : 'failed');
  } catch (err) {
    console.error('kapital callback error', err);
    return dashboard('failed');
  }
}
