'use server';

import { db } from '@/db/client';
import { dailyBookings, listings, notifications, users } from '@/db/schema';
import { eq, and, lt, gt, inArray, sql } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { sendEmail, emailShell, APP_URL } from './email';
import { sanitizeText, sanitizePhone } from './sanitize';
import { revalidatePath } from 'next/cache';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateDailyBookingInput {
  listingId: string;
  checkInIso: string;        // ISO date (YYYY-MM-DD or full ISO)
  checkOutIso: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestCount?: number;
  notes?: string;
}

export interface DailyBookingResult {
  ok: true;
  id: string;
}

export interface DailyBookingError {
  ok: false;
  error: string;
}

/**
 * Misafir rezervasyon talebi oluşturur. Çakışma kontrolü:
 * - Mevcut `pending` veya `approved` booking'lerle tarih aralığı kesişiyorsa reddedilir.
 * - Atomik: SELECT FOR UPDATE → INSERT (transaction).
 */
export async function createDailyBookingAction(
  input: CreateDailyBookingInput,
): Promise<DailyBookingResult | DailyBookingError> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: 'Rezervasyon için giriş yapmalısın.' };

  const checkIn = new Date(input.checkInIso);
  const checkOut = new Date(input.checkOutIso);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return { ok: false, error: 'Geçersiz tarih.' };
  }
  if (checkOut <= checkIn) {
    return { ok: false, error: 'Çıkış tarihi giriş tarihinden sonra olmalı.' };
  }
  const nowMinus1Day = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (checkIn < nowMinus1Day) return { ok: false, error: 'Geçmiş tarih seçemezsin.' };
  const maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  if (checkOut > maxDate) return { ok: false, error: 'Tarih 1 yıl içinde olmalı.' };

  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000));
  if (nights < 1) return { ok: false, error: 'En az 1 gece.' };

  const name = sanitizeText(input.guestName, { maxLength: 120 });
  if (name.length < 2) return { ok: false, error: 'İsim gerekli.' };
  const email = input.guestEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Geçersiz e-posta.' };
  const phone = input.guestPhone ? sanitizePhone(input.guestPhone) : null;
  if (input.guestPhone && !phone) return { ok: false, error: 'Geçersiz telefon.' };
  const notes = input.notes ? sanitizeText(input.notes, { maxLength: 1000 }) : null;
  const guestCount = Math.max(1, Math.min(input.guestCount ?? 1, 20));

  try {
    // Listing'i ve günlük kira bilgilerini al
    const [listing] = await db
      .select({
        id: listings.id,
        agentId: listings.agentId,
        dailyRentalEnabled: listings.dailyRentalEnabled,
        dailyRentalPricePerNight: listings.dailyRentalPricePerNight,
        dailyRentalCurrency: listings.dailyRentalCurrency,
        dailyRentalMinNights: listings.dailyRentalMinNights,
      })
      .from(listings)
      .where(eq(listings.id, input.listingId))
      .limit(1);

    if (!listing) return { ok: false, error: 'İlan bulunamadı.' };
    if (!listing.dailyRentalEnabled) return { ok: false, error: 'Bu ilan günlük kiralanmıyor.' };
    if (!listing.dailyRentalPricePerNight) return { ok: false, error: 'Günlük fiyat tanımlı değil.' };
    if (!listing.agentId) return { ok: false, error: 'İlan sahibi bulunamadı.' };
    if (nights < listing.dailyRentalMinNights) {
      return { ok: false, error: `En az ${listing.dailyRentalMinNights} gece rezervasyon yapılmalı.` };
    }

    const totalPrice = listing.dailyRentalPricePerNight * nights;
    const currency = listing.dailyRentalCurrency ?? 'USD';

    // Atomic overlap check + insert inside a transaction with row-level locking
    const txResult = await db.transaction(async (tx) => {
      // Lock the listing row to serialize concurrent booking attempts
      await tx.execute(sql`SELECT id FROM listings WHERE id = ${input.listingId} FOR UPDATE`);

      // Çakışma kontrolü (status IN pending/approved)
      const overlapping = await tx
        .select({ id: dailyBookings.id })
        .from(dailyBookings)
        .where(and(
          eq(dailyBookings.listingId, input.listingId),
          inArray(dailyBookings.status, ['pending', 'approved']),
          lt(dailyBookings.checkIn, checkOut),
          gt(dailyBookings.checkOut, checkIn),
        ))
        .limit(1);

      if (overlapping.length > 0) {
        return { ok: false as const, error: 'Bu tarihler için zaten bir rezervasyon var.' };
      }

      const [row] = await tx.insert(dailyBookings).values({
        listingId: input.listingId,
        ownerId: listing.agentId!,
        guestUserId: me.id,
        guestName: name,
        guestEmail: email,
        guestPhone: phone ?? undefined,
        checkIn,
        checkOut,
        nights,
        totalPrice,
        currency,
        guestCount,
        status: 'pending',
        notes: notes ?? undefined,
      }).returning({ id: dailyBookings.id });

      return { ok: true as const, id: row.id };
    });

    if (!txResult.ok) {
      return txResult;
    }

    const row = { id: txResult.id };

    // Sahibe notification
    await db.insert(notifications).values({
      userId: listing.agentId,
      type: 'daily_booking',
      title: 'Yeni günlük kira talebi',
      body: `${name} tarafından ${nights} gece için talep (${checkIn.toLocaleDateString('tr-TR')} - ${checkOut.toLocaleDateString('tr-TR')}).`,
      link: `/dashboard?tab=daily-bookings`,
    });

    // Sahibe e-posta bildirimi
    const [owner] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, listing.agentId))
      .limit(1);

    if (owner) {
      const listingRow = await db
        .select({ title: listings.title, slug: listings.slug })
        .from(listings)
        .where(eq(listings.id, input.listingId))
        .limit(1);
      const listingTitle = listingRow[0]?.title ?? 'İlan';
      const listingSlug = listingRow[0]?.slug;

      sendEmail({
        to: owner.email,
        subject: `Yeni günlük kira talebi — ${listingTitle}`,
        html: emailShell({
          preheader: `${name} tarafından ${nights} gecelik rezervasyon talebi.`,
          heroIcon: '🏡',
          heroEyebrow: 'Yeni Rezervasyon Talebi',
          title: 'Yeni günlük kira talebi',
          intro: `<strong style="color:#e8eef7;">${listingTitle}</strong> ilanın için yeni bir günlük kira talebi geldi.`,
          bodyHtml: `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f223a;border:1px solid #1d3858;border-radius:10px;">
              <tr><td style="padding:8px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding:9px 0;color:#93a4bf;font-size:13px;width:130px;">Misafir</td>
                    <td style="padding:9px 0;color:#e8eef7;font-size:14px;font-weight:600;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding:9px 0;color:#93a4bf;font-size:13px;width:130px;">Giriş</td>
                    <td style="padding:9px 0;color:#e8eef7;font-size:14px;font-weight:600;">${checkIn.toLocaleDateString('tr-TR')}</td>
                  </tr>
                  <tr>
                    <td style="padding:9px 0;color:#93a4bf;font-size:13px;width:130px;">Çıkış</td>
                    <td style="padding:9px 0;color:#e8eef7;font-size:14px;font-weight:600;">${checkOut.toLocaleDateString('tr-TR')}</td>
                  </tr>
                  <tr>
                    <td style="padding:9px 0;color:#93a4bf;font-size:13px;width:130px;">Gece</td>
                    <td style="padding:9px 0;color:#f97316;font-size:14px;font-weight:600;">${nights} gece</td>
                  </tr>
                  <tr>
                    <td style="padding:9px 0;color:#93a4bf;font-size:13px;width:130px;">Toplam</td>
                    <td style="padding:9px 0;color:#f97316;font-size:14px;font-weight:600;">${totalPrice} ${currency}</td>
                  </tr>
                </table>
              </td></tr>
            </table>`,
          ctaLabel: 'Talebi İncele',
          ctaUrl: `${APP_URL}/dashboard?tab=daily-bookings`,
          ...(listingSlug ? { secondaryCtaLabel: 'İlanı Görüntüle', secondaryCtaUrl: `${APP_URL}/property/${listingSlug}` } : {}),
        }),
        silent: true,
      }).catch((e) => console.warn('[daily-booking new mail]', e));
    }

    revalidatePath(`/property`);
    revalidatePath(`/dashboard`);

    return { ok: true, id: row.id };
  } catch (err) {
    console.error('createDailyBookingAction', err);
    return { ok: false, error: 'Rezervasyon kaydedilemedi.' };
  }
}

/** İlan sahibinin ya da adminin günlük booking'lerini listele. */
export async function getOwnerDailyBookings(ownerId: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error('Giriş gerekli');
  if (me.id !== ownerId && me.role !== 'admin' && me.role !== 'super_admin') {
    throw new Error('Yetkin yok');
  }
  return db
    .select()
    .from(dailyBookings)
    .where(eq(dailyBookings.ownerId, ownerId))
    .orderBy(sql`${dailyBookings.createdAt} DESC`);
}

/** Bir ilan için gelecekteki onaylı/bekleyen booking'lerin tarih aralıkları (takvim için). */
export async function getOccupiedRanges(listingId: string): Promise<{ checkIn: string; checkOut: string; status: string }[]> {
  try {
    const rows = await db
      .select({
        checkIn: dailyBookings.checkIn,
        checkOut: dailyBookings.checkOut,
        status: dailyBookings.status,
      })
      .from(dailyBookings)
      .where(and(
        eq(dailyBookings.listingId, listingId),
        inArray(dailyBookings.status, ['pending', 'approved']),
        gt(dailyBookings.checkOut, new Date()),
      ));
    return rows.map((r) => ({
      checkIn: r.checkIn.toISOString(),
      checkOut: r.checkOut.toISOString(),
      status: r.status,
    }));
  } catch (err) {
    console.error('getOccupiedRanges', err);
    return [];
  }
}

export async function approveDailyBookingAction(
  id: string,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: 'Giriş gerekli.' };

  const [booking] = await db.select().from(dailyBookings).where(eq(dailyBookings.id, id)).limit(1);
  if (!booking) return { ok: false, error: 'Rezervasyon bulunamadı.' };
  if (booking.ownerId !== me.id && me.role !== 'admin' && me.role !== 'super_admin') {
    return { ok: false, error: 'Yetkin yok.' };
  }
  if (booking.status !== 'pending') return { ok: false, error: 'Sadece bekleyen talep onaylanabilir.' };

  await db.update(dailyBookings)
    .set({
      status: 'approved',
      ownerResponseNote: note ? sanitizeText(note, { maxLength: 500 }) : null,
      respondedAt: new Date(),
    })
    .where(eq(dailyBookings.id, id));

  // Misafire notification (eğer kayıtlı kullanıcıysa)
  if (booking.guestUserId) {
    await db.insert(notifications).values({
      userId: booking.guestUserId,
      type: 'daily_booking',
      title: 'Rezervasyonun onaylandı 🎉',
      body: `${booking.checkIn.toLocaleDateString('tr-TR')} - ${booking.checkOut.toLocaleDateString('tr-TR')} arası rezervasyonun onaylandı.`,
      link: `/dashboard?tab=daily-bookings`,
    });
  }

  // Misafire e-posta bildirimi
  if (booking.guestEmail) {
    const [listingRow] = await db
      .select({ title: listings.title, slug: listings.slug })
      .from(listings)
      .where(eq(listings.id, booking.listingId))
      .limit(1);
    const listingTitle = listingRow?.title ?? 'İlan';
    const nights = Math.round(
      (booking.checkOut.getTime() - booking.checkIn.getTime()) / (24 * 60 * 60 * 1000),
    );

    sendEmail({
      to: booking.guestEmail,
      subject: `Rezervasyonun onaylandı — ${listingTitle}`,
      html: emailShell({
        preheader: `${booking.checkIn.toLocaleDateString('tr-TR')} - ${booking.checkOut.toLocaleDateString('tr-TR')} arası rezervasyonun onaylandı.`,
        heroIcon: '🎉',
        heroEyebrow: 'Rezervasyon Onaylandı',
        title: 'Rezervasyonun onaylandı!',
        intro: `<strong style="color:#e8eef7;">${listingTitle}</strong> için yaptığın rezervasyon talebi onaylandı.`,
        bodyHtml: `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f223a;border:1px solid #1d3858;border-radius:10px;">
            <tr><td style="padding:8px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:9px 0;color:#93a4bf;font-size:13px;width:130px;">Giriş</td>
                  <td style="padding:9px 0;color:#e8eef7;font-size:14px;font-weight:600;">${booking.checkIn.toLocaleDateString('tr-TR')}</td>
                </tr>
                <tr>
                  <td style="padding:9px 0;color:#93a4bf;font-size:13px;width:130px;">Çıkış</td>
                  <td style="padding:9px 0;color:#e8eef7;font-size:14px;font-weight:600;">${booking.checkOut.toLocaleDateString('tr-TR')}</td>
                </tr>
                <tr>
                  <td style="padding:9px 0;color:#93a4bf;font-size:13px;width:130px;">Gece</td>
                  <td style="padding:9px 0;color:#f97316;font-size:14px;font-weight:600;">${nights} gece</td>
                </tr>
                <tr>
                  <td style="padding:9px 0;color:#93a4bf;font-size:13px;width:130px;">Toplam</td>
                  <td style="padding:9px 0;color:#f97316;font-size:14px;font-weight:600;">${booking.totalPrice} ${booking.currency}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          ${note ? `<p style="margin:16px 0 0;color:#93a4bf;font-size:13px;line-height:1.6;">Ev sahibinin notu: <em style="color:#e8eef7;">${note}</em></p>` : ''}`,
        ctaLabel: 'Rezervasyonlarım',
        ctaUrl: `${APP_URL}/dashboard?tab=daily-bookings`,
        ...(listingRow?.slug ? { secondaryCtaLabel: 'İlanı Görüntüle', secondaryCtaUrl: `${APP_URL}/property/${listingRow.slug}` } : {}),
      }),
      silent: true,
    }).catch((e) => console.warn('[daily-booking approve mail]', e));
  }

  revalidatePath('/dashboard');
  return { ok: true };
}

export async function rejectDailyBookingAction(
  id: string,
  note: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: 'Giriş gerekli.' };

  const reason = sanitizeText(note, { maxLength: 500 });
  if (reason.length < 3) return { ok: false, error: 'Lütfen kısa bir red sebebi yaz.' };

  const [booking] = await db.select().from(dailyBookings).where(eq(dailyBookings.id, id)).limit(1);
  if (!booking) return { ok: false, error: 'Rezervasyon bulunamadı.' };
  if (booking.ownerId !== me.id && me.role !== 'admin' && me.role !== 'super_admin') {
    return { ok: false, error: 'Yetkin yok.' };
  }
  if (booking.status !== 'pending') return { ok: false, error: 'Sadece bekleyen talep reddedilebilir.' };

  await db.update(dailyBookings)
    .set({
      status: 'rejected',
      ownerResponseNote: reason,
      respondedAt: new Date(),
    })
    .where(eq(dailyBookings.id, id));

  if (booking.guestUserId) {
    await db.insert(notifications).values({
      userId: booking.guestUserId,
      type: 'daily_booking',
      title: 'Rezervasyon reddedildi',
      body: `Talebin reddedildi. Sebep: ${reason}`,
      link: `/dashboard?tab=daily-bookings`,
    });
  }

  // Misafire red e-postası
  if (booking.guestEmail) {
    const [listingRow] = await db
      .select({ title: listings.title, slug: listings.slug })
      .from(listings)
      .where(eq(listings.id, booking.listingId))
      .limit(1);
    const listingTitle = listingRow?.title ?? 'İlan';

    sendEmail({
      to: booking.guestEmail,
      subject: `Rezervasyon talebin reddedildi — ${listingTitle}`,
      html: emailShell({
        preheader: 'Günlük kira talebiniz reddedildi.',
        heroIcon: '😔',
        heroEyebrow: 'Rezervasyon Reddedildi',
        title: 'Talebin reddedildi',
        intro: `<strong style="color:#e8eef7;">${listingTitle}</strong> için yaptığın rezervasyon talebi ev sahibi tarafından reddedildi.`,
        bodyHtml: `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f223a;border:1px solid #1d3858;border-radius:10px;">
            <tr><td style="padding:8px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:9px 0;color:#93a4bf;font-size:13px;width:130px;">Giriş</td>
                  <td style="padding:9px 0;color:#e8eef7;font-size:14px;font-weight:600;">${booking.checkIn.toLocaleDateString('tr-TR')}</td>
                </tr>
                <tr>
                  <td style="padding:9px 0;color:#93a4bf;font-size:13px;width:130px;">Çıkış</td>
                  <td style="padding:9px 0;color:#e8eef7;font-size:14px;font-weight:600;">${booking.checkOut.toLocaleDateString('tr-TR')}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;">
            <tr>
              <td style="background:#0f223a;border-left:4px solid #ef4444;border-radius:10px;padding:16px 18px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#ef4444;margin-bottom:6px;">Red Sebebi</div>
                <div style="color:#e8eef7;font-size:14px;line-height:1.6;">${reason}</div>
              </td>
            </tr>
          </table>`,
        ctaLabel: 'Diğer İlanları Keşfet',
        ctaUrl: `${APP_URL}/listings`,
        secondaryCtaLabel: 'Rezervasyonlarım',
        secondaryCtaUrl: `${APP_URL}/dashboard?tab=daily-bookings`,
        tipBox: {
          title: 'Bilgi',
          body: 'Farklı tarihler için tekrar rezervasyon talebinde bulunabilir veya başka ilanlara göz atabilirsin.',
        },
      }),
      silent: true,
    }).catch((e) => console.warn('[daily-booking reject mail]', e));
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
