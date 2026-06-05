'use server';

import { db } from '@/db/client';
import { rpaReports, payments, listings, users, notifications } from '@/db/schema';
import { and, eq, inArray, desc, isNull } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { getPrice } from './pricing';
import { maybeStartCheckout } from './payment-provider';
import { sendEmail } from './email';
import { stripCrlf } from './security';

export type RpaRequestResult =
  | { ok: true; paymentId: string; amount: number; currency: 'USD'; checkoutUrl?: string }
  | { ok: false; error: string };

/**
 * RPA rapor talebi (Madde 7). Kullanıcı kendi ilanlarını listeden + başka
 * ilanları numarayla seçer; ücretli. Ödeme onaylanınca "birkaç saat içinde mail"
 * notu gönderilir; ekip raporu elle hazırlar.
 */
export async function requestRpaReportAction(
  listingNumbers: number[],
): Promise<RpaRequestResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };

  // Temizle + tekilleştir + sınırla.
  const nums = Array.from(new Set(
    (listingNumbers ?? [])
      .map((n) => Math.trunc(Number(n)))
      .filter((n) => Number.isFinite(n) && n > 0),
  )).slice(0, 20);
  if (nums.length === 0) return { ok: false, error: 'En az bir ilan seç (numarayla).' };

  try {
    // Sadece gerçekten var olan (silinmemiş) ilanları kabul et.
    const existing = await db
      .select({ n: listings.listingNumber })
      .from(listings)
      .where(and(inArray(listings.listingNumber, nums), isNull(listings.deletedAt)));
    const validNums = existing.map((r) => r.n);
    if (validNums.length === 0) return { ok: false, error: 'Geçerli ilan numarası bulunamadı.' };

    const amount = await getPrice('rpa_report');
    const [paymentRow] = await db.insert(payments).values({
      userId: user.id,
      type: 'report_purchase',
      amount,
      currency: 'USD',
      status: 'pending',
    }).returning();

    await db.insert(rpaReports).values({
      userId: user.id,
      listingNumbers: validNums,
      status: 'pending',
      paymentId: paymentRow.id,
    });

    const checkoutUrl = await maybeStartCheckout({
      paymentId: paymentRow.id, amount, currency: 'USD', description: 'RPA rapor talebi',
    });
    return { ok: true, paymentId: paymentRow.id, amount, currency: 'USD', checkoutUrl };
  } catch (err) {
    console.error('requestRpaReport error', err);
    return { ok: false, error: 'RPA rapor talebi oluşturulamadı.' };
  }
}

export interface MyRpaReport {
  id: string;
  listingNumbers: number[];
  status: string;
  fileUrl: string | null;
  createdAt: string;
}

/** Kullanıcının RPA rapor taleplerini döndürür (ödenmiş olanlar). */
export async function getMyRpaReports(): Promise<MyRpaReport[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db
    .select({ r: rpaReports, payStatus: payments.status })
    .from(rpaReports)
    .leftJoin(payments, eq(rpaReports.paymentId, payments.id))
    .where(eq(rpaReports.userId, user.id))
    .orderBy(desc(rpaReports.createdAt))
    .limit(100);
  // Sadece ödemesi tamamlanan talepleri göster.
  return rows
    .filter((x) => x.payStatus === 'paid')
    .map((x) => ({
      id: x.r.id,
      listingNumbers: (x.r.listingNumbers ?? []) as number[],
      status: x.r.status,
      fileUrl: x.r.fileUrl,
      createdAt: x.r.createdAt.toISOString(),
    }));
}

// ---- Admin --------------------------------------------------------------

export interface AdminRpaReport {
  id: string;
  userName: string;
  userEmail: string;
  listingNumbers: number[];
  status: string;
  fileUrl: string | null;
  note: string | null;
  createdAt: string;
}

/** Admin: ödenmiş RPA taleplerini döndürür (varsayılan: bekleyenler). */
export async function getAdminRpaReports(
  status?: 'pending' | 'generated' | 'sent',
): Promise<AdminRpaReport[]> {
  const conds = [eq(payments.status, 'paid')];
  if (status) conds.push(eq(rpaReports.status, status));
  const rows = await db
    .select({ r: rpaReports, userName: users.name, userEmail: users.email })
    .from(rpaReports)
    .innerJoin(users, eq(rpaReports.userId, users.id))
    .leftJoin(payments, eq(rpaReports.paymentId, payments.id))
    .where(and(...conds))
    .orderBy(desc(rpaReports.createdAt))
    .limit(200);
  return rows.map((x) => ({
    id: x.r.id,
    userName: x.userName,
    userEmail: x.userEmail,
    listingNumbers: (x.r.listingNumbers ?? []) as number[],
    status: x.r.status,
    fileUrl: x.r.fileUrl,
    note: x.r.note,
    createdAt: x.r.createdAt.toISOString(),
  }));
}

/** Admin: raporu "gönderildi" işaretler (elle hazırlanıp maillenince) + kullanıcıya bildirim. */
export async function markRpaReportSentAction(
  reportId: string,
  fileUrl?: string,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'moderator')) {
    return { ok: false, error: 'Yetkin yok.' };
  }
  try {
    const [updated] = await db.update(rpaReports)
      .set({
        status: 'sent',
        sentAt: new Date(),
        fileUrl: fileUrl ? stripCrlf(fileUrl).trim().slice(0, 1000) : null,
        note: note ? stripCrlf(note).trim().slice(0, 1000) : null,
      })
      .where(eq(rpaReports.id, reportId))
      .returning({ userId: rpaReports.userId });
    if (updated) {
      const [u] = await db.select().from(users).where(eq(users.id, updated.userId)).limit(1);
      await db.insert(notifications).values({
        userId: updated.userId,
        type: 'system',
        title: 'RPA Raporunuz Hazır',
        body: 'Talep ettiğiniz RPA raporu mail adresinize gönderildi.',
        link: '/dashboard?tab=rpa-reports',
      });
      if (u) {
        sendEmail({
          to: u.email,
          subject: 'RPA raporunuz hazır — ISTBAKU',
          html: `<p>Merhaba ${u.name},</p><p>Talep ettiğiniz RPA raporu hazırlandı${fileUrl ? ` ve şu adreste: ${fileUrl}` : ''}.</p><p>ISTBAKU</p>`,
          silent: true,
        }).catch((e) => console.warn('[rpa-sent mail]', e));
      }
    }
    return { ok: true };
  } catch (err) {
    console.error('markRpaReportSent error', err);
    return { ok: false, error: 'İşlem başarısız.' };
  }
}
