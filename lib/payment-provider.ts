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

import { db } from '@/db/client';
import { payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { APP_URL } from './email';
import {
  createKapitalOrder,
  buildHppRedirectUrl,
  appendKapitalRef,
} from './kapital';

export type PaymentMode = 'mock' | 'live';

export function getPaymentMode(): PaymentMode {
  const key = process.env.PAYMENT_PROVIDER_KEY;
  return !key || key === 'mock' ? 'mock' : 'live';
}

export function isMockPayments(): boolean {
  return getPaymentMode() === 'mock';
}

/**
 * LIVE mod için sağlayıcı (Kapital Bank HPP) ödeme oturumu oluşturur:
 *   1. Bankada order açar (POST /order/).
 *   2. Banka order kimliğini payments.providerRef'e ekler ("kapital:<id>:<pwd>").
 *   3. Kullanıcının yönlendirileceği HPP URL'ini döndürür.
 *
 * Banka ödeme sonrası `${APP_URL}/api/payments/kapital/callback?paymentId=...`
 * adresine geri döner; orada durum DOĞRULANIP confirmPayment çağrılır.
 */
export async function createProviderCheckout(args: {
  paymentId: string;
  amount: number; // minör birim (cent)
  currency: string;
  description: string;
}): Promise<{ url: string } | { error: string }> {
  try {
    const redirectUrl = `${APP_URL}/api/payments/kapital/callback?paymentId=${args.paymentId}`;
    const order = await createKapitalOrder({
      amountMinor: args.amount,
      description: args.description,
      redirectUrl,
    });

    // Banka order kimliğini mevcut providerRef'e ekle (üzerine yazma — tier akışı korunur).
    const [row] = await db
      .select({ providerRef: payments.providerRef })
      .from(payments)
      .where(eq(payments.id, args.paymentId))
      .limit(1);
    await db
      .update(payments)
      .set({ providerRef: appendKapitalRef(row?.providerRef ?? null, order) })
      .where(eq(payments.id, args.paymentId));

    return { url: buildHppRedirectUrl(order) };
  } catch (err) {
    console.error('createProviderCheckout (kapital) error', err);
    return { error: 'PAYMENT_PROVIDER_ERROR' };
  }
}

/**
 * Ödeme action'larının ortak yardımcısı.
 * - MOCK modda: undefined döner → istemci mevcut mock-confirm akışını kullanır.
 * - LIVE modda: banka checkout URL'i döner → PaymentModal oraya yönlendirir.
 *
 * Live modda banka order'ı açılamazsa hata fırlatır; çağıran action kendi
 * generic hata mesajını döndürür (pending payment kaydı orphan kalır, sorun değil).
 */
export async function maybeStartCheckout(args: {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
}): Promise<string | undefined> {
  if (isMockPayments()) return undefined;
  const res = await createProviderCheckout(args);
  if ('error' in res) {
    throw new Error(res.error);
  }
  return res.url;
}
