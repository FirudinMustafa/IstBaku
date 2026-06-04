import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { confirmPayment } from '@/lib/payment-confirm';
import {
  getKapitalOrderOutcome,
  parseKapitalRef,
  isPaidStatus,
  classifyKapitalFailure,
} from '@/lib/kapital';
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

  const dashboard = (state: 'success' | 'failed' | 'pending', reason?: string) =>
    NextResponse.redirect(
      `${APP_URL}/dashboard?tab=listings&payment=${state}${reason ? `&reason=${reason}` : ''}`,
    );

  if (!paymentId) {
    return dashboard('failed', 'generic');
  }

  try {
    // 1. Ödeme kaydını bul (banka order kimliği providerRef'e gömülü).
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) return dashboard('failed', 'generic');
    // Zaten onaylanmışsa (örn. kullanıcı geri butonuna bastı) tekrar işleme.
    if (payment.status === 'paid') return dashboard('success');

    const ref = parseKapitalRef(payment.providerRef);
    if (!ref) return dashboard('failed', 'generic');

    // 2. Bankadan gerçek durumu + decline kodunu doğrula.
    const outcome = await getKapitalOrderOutcome(ref.orderId);

    if (!isPaidStatus(outcome.status)) {
      // Ödeme tamamlanmadı — pending bırak, KESIN sebebi kullanıcıya ilet.
      const reason = classifyKapitalFailure(outcome.status, outcome.pmoResultCode);
      return dashboard('failed', reason);
    }

    // 3. Doğrulandı → ödemeyi onayla (ilan güncelleme + bildirim + e-posta).
    const result = await confirmPayment(paymentId);
    return dashboard(result.ok ? 'success' : 'failed', result.ok ? undefined : 'generic');
  } catch (err) {
    console.error('kapital callback error', err);
    return dashboard('failed', 'generic');
  }
}
