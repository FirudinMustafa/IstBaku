/**
 * Kapital Bank E-Commerce (HPP) ödeme ağ geçidi istemcisi.
 *
 * Düşük seviyeli sarmalayıcı: order oluşturma, durum sorgulama ve HPP redirect
 * URL üretimi. Üst seviye akış `lib/payment-provider.ts` içinde.
 *
 * Akış (Order_SMS — basit satış):
 *   1. createKapitalOrder() → { id, password, hppUrl }
 *   2. Kullanıcı buildHppRedirectUrl(...) adresine yönlendirilir, kartı BANKADA girer.
 *   3. Banka, hppRedirectUrl (callback) adresine ?ID=&STATUS= ile geri döner.
 *   4. getKapitalOrder(id) ile durum DOĞRULANIR (callback STATUS'una güvenilmez).
 *
 * Dokümantasyon: https://documenter.getpostman.com/view/14817621/2sA3dxCB1b
 */

const BASE_URL = process.env.KAPITAL_BASE_URL ?? 'https://txpgtst.kapitalbank.az/api';
const USERNAME = process.env.KAPITAL_USERNAME ?? '';
const PASSWORD = process.env.KAPITAL_PASSWORD ?? '';

function authHeader(): string {
  const token = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
  return `Basic ${token}`;
}

/** Minör birim (cent) → bankanın beklediği "19.00" string formatı. */
function toBankAmount(minor: number): string {
  return (minor / 100).toFixed(2);
}

export interface KapitalOrder {
  id: number;
  password: string;
  /** HPP taban URL'i — örn. https://txpgtst.kapitalbank.az/flex */
  hppUrl: string;
  status: string;
  secret?: string;
}

export interface CreateOrderArgs {
  /** Minör birim (cent). 1900 → 19.00 AZN gönderilir. */
  amountMinor: number;
  /** Banka AZN bekler. */
  currency?: string;
  description: string;
  /** Banka ödeme sonrası buraya geri döner. */
  redirectUrl: string;
  language?: 'az' | 'en' | 'ru';
  /** Order_SMS = satış (varsayılan), Order_DMS = preauth. */
  typeRid?: 'Order_SMS' | 'Order_DMS';
}

/** POST /order/ — yeni ödeme order'ı oluşturur. */
export async function createKapitalOrder(args: CreateOrderArgs): Promise<KapitalOrder> {
  const body = {
    order: {
      typeRid: args.typeRid ?? 'Order_SMS',
      amount: toBankAmount(args.amountMinor),
      currency: args.currency ?? 'AZN',
      language: args.language ?? 'az',
      description: args.description,
      hppRedirectUrl: args.redirectUrl,
    },
  };

  const res = await fetch(`${BASE_URL}/order/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Kapital createOrder ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text) as { order?: KapitalOrder };
  if (!data.order?.id || !data.order.password || !data.order.hppUrl) {
    throw new Error(`Kapital createOrder eksik yanıt: ${text.slice(0, 300)}`);
  }
  return data.order;
}

export interface KapitalOrderStatus {
  id: number;
  status: string;
  prevStatus?: string;
  amount?: number;
  currency?: string;
}

/** GET /order/{id} — order durumunu sorgular (doğrulama için). */
export async function getKapitalOrder(id: number | string): Promise<KapitalOrderStatus> {
  const res = await fetch(`${BASE_URL}/order/${id}`, {
    method: 'GET',
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Kapital getOrder ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = JSON.parse(text) as { order?: KapitalOrderStatus };
  if (!data.order?.status) {
    throw new Error(`Kapital getOrder eksik yanıt: ${text.slice(0, 300)}`);
  }
  return data.order;
}

/**
 * Kullanıcının yönlendirileceği HPP adresi.
 * createOrder yanıtındaki hppUrl zaten /flex ile biter; üzerine id+password eklenir.
 * Örn: https://txpgtst.kapitalbank.az/flex?id=4595&password=8xjpd1ejxdma
 */
export function buildHppRedirectUrl(order: Pick<KapitalOrder, 'hppUrl' | 'id' | 'password'>): string {
  const sep = order.hppUrl.includes('?') ? '&' : '?';
  return `${order.hppUrl}${sep}id=${order.id}&password=${encodeURIComponent(order.password)}`;
}

/**
 * Bankanın "ödendi" sayılan durumları. Callback doğrulamasında kullanılır.
 * FullyPaid → tam ödeme; Authorized → preauth tutuldu (DMS akışı).
 */
export function isPaidStatus(status: string): boolean {
  return status === 'FullyPaid' || status === 'Authorized' || status === 'PartiallyPaid';
}

// ---- providerRef yardımcıları --------------------------------------------
// payments.providerRef içine banka order kimliğini gömeriz:
//   "kapital:<orderId>:<password>"
// Mevcut tier akışı providerRef'i ("pending-tier:premium-...") kullandığından,
// ÜZERINE yazmadan ekleme yaparız: "<eski>;kapital:<id>:<pwd>".

export function appendKapitalRef(existing: string | null, order: KapitalOrder): string {
  const segment = `kapital:${order.id}:${order.password}`;
  return existing ? `${existing};${segment}` : segment;
}

export function parseKapitalRef(providerRef: string | null): { orderId: string; password: string } | null {
  if (!providerRef) return null;
  for (const part of providerRef.split(';')) {
    if (part.startsWith('kapital:')) {
      const [, orderId, password] = part.split(':');
      if (orderId) return { orderId, password: password ?? '' };
    }
  }
  return null;
}

// ---- Hata / decline sınıflandırması -------------------------------------
// Başarısız ödemelerde kullanıcıya KESIN sebep göstermek için. Order durumu
// (Cancelled/Expired…) + son işlemin PmoDecline kodunu (51/59/81…) okuyup
// i18n anahtarı olan bir kategoriye eşleriz.

export interface KapitalOrderOutcome {
  status: string;
  /** Son transaction'ın PmoDecline kodu (varsa). */
  pmoResultCode?: string;
}

/** GET /order/{id}?tranDetailLevel=2 — durum + son işlemin pmoResultCode'u. */
export async function getKapitalOrderOutcome(id: number | string): Promise<KapitalOrderOutcome> {
  const res = await fetch(`${BASE_URL}/order/${id}?tranDetailLevel=2`, {
    method: 'GET',
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Kapital getOrderOutcome ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = JSON.parse(text) as {
    order?: { status?: string; trans?: Array<{ pmoResultCode?: string | number }> };
  };
  const order = data.order ?? {};
  let pmoResultCode: string | undefined;
  if (Array.isArray(order.trans) && order.trans.length) {
    const last = order.trans[order.trans.length - 1];
    if (last?.pmoResultCode != null) pmoResultCode = String(last.pmoResultCode);
  }
  return { status: order.status ?? 'Unknown', pmoResultCode };
}

/** Kullanıcıya gösterilecek başarısızlık sebebi (i18n anahtarı kategorisi). */
export type PaymentFailReason =
  | 'cancelled'    // kullanıcı vazgeçti / reddetti
  | 'expired'      // ödeme süresi doldu
  | 'insufficient' // yetersiz bakiye
  | 'expired_card' // kartın süresi dolmuş
  | 'invalid_card' // geçersiz / kısıtlı kart
  | 'bad_cvv'      // hatalı CVV
  | 'bad_pin'      // hatalı PIN
  | 'auth_failed'  // 3D Secure / kimlik doğrulama başarısız
  | 'limit'        // limit aşıldı
  | 'generic';     // diğer / bilinmeyen

/**
 * Order durumu + PmoDecline kodunu kullanıcı dostu bir sebep kategorisine eşler.
 * Kodlar Kapital Bank "PmoDecline Codes" tablosundan.
 */
export function classifyKapitalFailure(status: string, pmoResultCode?: string): PaymentFailReason {
  if (status === 'Cancelled' || status === 'Refused' || status === 'Rejected') return 'cancelled';
  if (status === 'Expired') return 'expired';

  const c = pmoResultCode != null ? parseInt(pmoResultCode, 10) : NaN;
  switch (c) {
    case 24: case 51:
      return 'expired_card';
    case 59: case 61: case 63: case 64: case 95:
      return 'insufficient';
    case 22: case 60: case 65:
      return 'limit';
    case 80: case 81:
      return 'bad_cvv';
    case 53: case 62: case 83:
      return 'bad_pin';
    case 75: case 84: case 85:
      return 'auth_failed';
    case 14: case 29: case 30: case 40: case 41: case 49: case 50: case 52: case 56: case 57: case 58:
      return 'invalid_card';
    default:
      // 3DS reddi order seviyesinde "Declined" olarak da gelebilir.
      if (status === 'Declined') return 'auth_failed';
      return 'generic';
  }
}
