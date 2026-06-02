/**
 * Ödeme sağlayıcı soyutlaması — TEK entegrasyon noktası.
 *
 * Şu an gerçek bir sağlayıcı (Stripe / Iyzico / yerel banka) bağlı DEĞİL.
 * `PAYMENT_PROVIDER_KEY` env değeri:
 *   - tanımsız veya 'mock'  → MOCK mod: ödeme penceresi açılır, kullanıcı
 *                             bilgilerini girer, ödeme `/api/payments/mock-confirm`
 *                             ile anında onaylanır (gerçek tahsilat YOK).
 *   - başka bir değer       → LIVE mod: ileride `createProviderCheckout()`
 *                             sağlayıcının ödeme sayfası URL'ini döndürecek ve
 *                             kullanıcı oraya yönlendirilecek.
 *
 * Gerçek sağlayıcı bağlanınca SADECE bu dosya ve webhook handler'ı değişir;
 * çağıran taraflar (wizard, owner action'lar) aynı kalır.
 */

export type PaymentMode = 'mock' | 'live';

export function getPaymentMode(): PaymentMode {
  const key = process.env.PAYMENT_PROVIDER_KEY;
  return !key || key === 'mock' ? 'mock' : 'live';
}

export function isMockPayments(): boolean {
  return getPaymentMode() === 'mock';
}

/**
 * LIVE mod için sağlayıcı ödeme oturumu oluşturur ve checkout URL döndürür.
 * Henüz uygulanmadı — sağlayıcı seçilince burada SDK çağrısı yapılacak.
 */
export async function createProviderCheckout(_args: {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
}): Promise<{ url: string } | { error: string }> {
  // TODO(payments): Stripe/Iyzico/yerel banka SDK ile PaymentIntent/checkout oluştur.
  return { error: 'PAYMENT_PROVIDER_NOT_CONFIGURED' };
}
