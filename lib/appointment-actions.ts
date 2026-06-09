'use server';

import { db } from '@/db/client';
import { appointments, listings, users, notifications } from '@/db/schema';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import {
  sendEmail, tplAppointmentVisitor, tplAppointmentAgent,
  tplAppointmentRejected, tplAppointmentRescheduled, APP_URL,
} from './email';
import { sanitizeText, sanitizePhone } from './sanitize';

/** Slotu hâlâ "dolu" sayan durumlar — reddedilen/iptal/tamamlanan slotlar tekrar açılır. */
const ACTIVE_STATUSES = ['pending', 'confirmed', 'rescheduled'] as const;

export interface CreateAppointmentInput {
  listingId: string;
  agentId: string;
  scheduledAtIso: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * MC-09 / MC-15: requires an authenticated session and uses an atomic
 * insert with `onConflictDoNothing` on the (agentId, scheduledAt) unique
 * index to prevent slot races.
 */
export async function createAppointmentAction(
  input: CreateAppointmentInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  // MC-09: session required.
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: 'Randevu için giriş yapmalısın.' };

  try {
    const scheduledAt = new Date(input.scheduledAtIso);
    if (Number.isNaN(scheduledAt.getTime())) return { ok: false, error: 'Geçersiz tarih.' };
    // MEDIUM-018: must be in the future and within a reasonable window.
    const nowPlus15Min = new Date(Date.now() + 15 * 60 * 1000);
    const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    if (scheduledAt < nowPlus15Min) return { ok: false, error: 'Geçmiş tarih seçemezsin.' };
    if (scheduledAt > maxDate) return { ok: false, error: 'Tarih 90 gün içinde olmalı.' };

    // Validate inputs.
    const name = sanitizeText(input.name, { maxLength: 120 });
    if (name.length < 2) return { ok: false, error: 'İsim gerekli.' };
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, error: 'Geçersiz e-posta.' };
    const phone = input.phone ? sanitizePhone(input.phone) : null;
    if (input.phone && !phone) return { ok: false, error: 'Geçersiz telefon.' };
    const notes = input.notes ? sanitizeText(input.notes, { maxLength: 1000 }) : null;

    // Validate the target agent actually exists and is an agent/admin.
    const [agentRow] = await db.select({ id: users.id, role: users.role, name: users.name, email: users.email, status: users.status })
      .from(users).where(eq(users.id, input.agentId)).limit(1);
    if (!agentRow || agentRow.status === 'suspended') {
      return { ok: false, error: 'Ajan bulunamadı.' };
    }

    // Validate the target listing exists.
    const [listing] = await db.select({ id: listings.id, title: listings.title, slug: listings.slug, agentId: listings.agentId, country: listings.country })
      .from(listings).where(eq(listings.id, input.listingId)).limit(1);
    if (!listing) return { ok: false, error: 'İlan bulunamadı.' };

    // MC-09 / MC-15: atomik insert. Kısmi unique index (agent_id, scheduled_at)
    // sadece AKTİF randevuları kapsar; çakışma 23505 unique ihlali olarak yakalanır.
    // Madde 7: randevu artık 'pending' başlar — ofis onaylar/reddeder/yeni saat önerir.
    let a: typeof appointments.$inferSelect;
    try {
      const inserted = await db.insert(appointments).values({
        listingId: input.listingId,
        agentId: input.agentId,
        visitorUserId: me.id,
        visitorName: name,
        visitorEmail: email,
        visitorPhone: phone ?? undefined,
        scheduledAt,
        status: 'pending',
        notes: notes ?? undefined,
      }).returning();
      a = inserted[0];
    } catch (e: unknown) {
      // Postgres unique_violation → slot dolu.
      if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === '23505') {
        return { ok: false, error: 'Bu saat dolu.' };
      }
      throw e;
    }

    const propertyUrl = `${APP_URL}/property/${listing.slug}`;
    const dashboardUrl = `${APP_URL}/agent`;

    // Ziyaretçiye "talebin alındı, onay bekleniyor" maili
    sendEmail({
      to: email,
      subject: `Randevu talebin alındı — ${listing.title}`,
      html: tplAppointmentVisitor({
        visitorName: name,
        agentName: agentRow.name,
        listingTitle: listing.title,
        when: scheduledAt,
        propertyUrl,
        country: listing.country,
        pending: true,
      }),
      silent: true,
    }).catch((e) => console.warn('[appt visitor mail]', e));

    // Ajana lead bildirimi (onay bekliyor)
    sendEmail({
      to: agentRow.email,
      subject: `Yeni gezinti talebi — ${listing.title}`,
      html: tplAppointmentAgent({
        agentName: agentRow.name,
        visitorName: name,
        visitorEmail: email,
        visitorPhone: phone ?? undefined,
        listingTitle: listing.title,
        when: scheduledAt,
        dashboardUrl,
        country: listing.country,
      }),
      silent: true,
    }).catch((e) => console.warn('[appt agent mail]', e));

    // Ajana in-app bildirim
    await db.insert(notifications).values({
      userId: listing.agentId!,
      type: 'appointment',
      title: 'Yeni gezinti randevu talebi',
      body: `${name} — ${listing.title} için randevu talebi oluşturdu. Onayla/reddet/yeni saat öner.`,
      link: '/agent',
    }).catch((e) => console.warn('[appt notification]', e));

    return { ok: true, id: a.id };
  } catch (err) {
    console.error('createAppointment', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

/**
 * Internal: full appointment rows including visitor PII. Only callable by
 * the agent themselves or an admin (MH-08).
 */
export async function getAgentAppointments(agentId: string, from?: Date, to?: Date) {
  const me = await getCurrentUser();
  const isOwner = me?.id === agentId;
  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';
  if (!isOwner && !isAdmin) {
    // Non-agent caller: return empty (do NOT leak visitor PII).
    return [];
  }
  const conds = [eq(appointments.agentId, agentId)];
  if (from) conds.push(gte(appointments.scheduledAt, from));
  if (to) conds.push(lte(appointments.scheduledAt, to));
  return db.select().from(appointments).where(and(...conds));
}

/**
 * Public-ish: returns ONLY the booked slot timestamps for an agent. No
 * visitor name/email/phone leaks (MH-08).
 */
export async function getBookedSlotsAction(
  agentId: string,
  fromIso: string,
  toIso: string,
): Promise<{ ok: true; slots: string[] } | { ok: false; error: string }> {
  try {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return { ok: false, error: 'Geçersiz tarih aralığı.' };
    }
    // Only ever return the timestamp — never visitor info.
    const rows = await db.select({ at: appointments.scheduledAt })
      .from(appointments)
      .where(and(
        eq(appointments.agentId, agentId),
        gte(appointments.scheduledAt, from),
        lte(appointments.scheduledAt, to),
        inArray(appointments.status, [...ACTIVE_STATUSES]),
      ));
    return { ok: true, slots: rows.map((r) => r.at.toISOString()) };
  } catch (err) {
    console.error('getBookedSlots', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

// ============================================================
// Madde 7 — Ofis onay/red/yeni-saat + kullanıcı takip akışları
// ============================================================

type ActionResult = { ok: true } | { ok: false; error: string };

/** Randevu + ilan (TZ için country) + bağlamı yükler; yetki rolünü döndürür. */
async function loadAppointmentCtx(appointmentId: string) {
  const me = await getCurrentUser();
  if (!me) return { ok: false as const, error: 'Giriş yapmalısın.' };
  const [row] = await db
    .select({ appt: appointments, listing: listings })
    .from(appointments)
    .leftJoin(listings, eq(appointments.listingId, listings.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!row || !row.appt) return { ok: false as const, error: 'Randevu bulunamadı.' };
  const isAgent = row.appt.agentId === me.id;
  const isVisitor = row.appt.visitorUserId === me.id;
  const isAdmin = me.role === 'admin' || me.role === 'super_admin';
  return { ok: true as const, me, appt: row.appt, listing: row.listing, isAgent, isVisitor, isAdmin };
}

function notifyVisitor(appt: typeof appointments.$inferSelect, title: string, body: string) {
  if (!appt.visitorUserId) return Promise.resolve();
  return db.insert(notifications).values({
    userId: appt.visitorUserId,
    type: 'appointment',
    title,
    body,
    link: '/dashboard?tab=appointments',
  }).catch((e) => console.warn('[appt notify visitor]', e));
}

/** Ofis: bekleyen randevuyu ONAYLAR. */
export async function confirmAppointmentAction(appointmentId: string): Promise<ActionResult> {
  const ctx = await loadAppointmentCtx(appointmentId);
  if (!ctx.ok) return ctx;
  if (!ctx.isAgent && !ctx.isAdmin) return { ok: false, error: 'Bu randevu sana ait değil.' };
  if (ctx.appt.status !== 'pending') return { ok: false, error: 'Sadece bekleyen randevular onaylanabilir.' };

  await db.update(appointments).set({ status: 'confirmed' }).where(eq(appointments.id, appointmentId));

  const [agent] = await db.select({ name: users.name }).from(users).where(eq(users.id, ctx.appt.agentId)).limit(1);
  if (ctx.listing) {
    sendEmail({
      to: ctx.appt.visitorEmail,
      subject: `Randevun onaylandı — ${ctx.listing.title}`,
      html: tplAppointmentVisitor({
        visitorName: ctx.appt.visitorName,
        agentName: agent?.name ?? 'Ofis',
        listingTitle: ctx.listing.title,
        when: ctx.appt.scheduledAt,
        propertyUrl: `${APP_URL}/property/${ctx.listing.slug}`,
        country: ctx.listing.country,
        pending: false,
      }),
      silent: true,
    }).catch((e) => console.warn('[appt confirm mail]', e));
  }
  await notifyVisitor(ctx.appt, 'Randevun onaylandı', `${ctx.listing?.title ?? 'İlan'} için gezinti randevun onaylandı.`);
  return { ok: true };
}

/** Ofis: bekleyen randevuyu REDDEDER. */
export async function rejectAppointmentAction(appointmentId: string, reason?: string): Promise<ActionResult> {
  const ctx = await loadAppointmentCtx(appointmentId);
  if (!ctx.ok) return ctx;
  if (!ctx.isAgent && !ctx.isAdmin) return { ok: false, error: 'Bu randevu sana ait değil.' };
  if (ctx.appt.status !== 'pending' && ctx.appt.status !== 'rescheduled') {
    return { ok: false, error: 'Bu randevu reddedilemez.' };
  }
  const cleanReason = reason ? sanitizeText(reason, { maxLength: 300 }) : undefined;

  await db.update(appointments).set({ status: 'rejected', notes: cleanReason ?? ctx.appt.notes }).where(eq(appointments.id, appointmentId));

  const [agent] = await db.select({ name: users.name }).from(users).where(eq(users.id, ctx.appt.agentId)).limit(1);
  if (ctx.listing) {
    sendEmail({
      to: ctx.appt.visitorEmail,
      subject: `Randevu talebin onaylanamadı — ${ctx.listing.title}`,
      html: tplAppointmentRejected({
        visitorName: ctx.appt.visitorName,
        agentName: agent?.name ?? 'Ofis',
        listingTitle: ctx.listing.title,
        when: ctx.appt.scheduledAt,
        country: ctx.listing.country,
        reason: cleanReason,
      }),
      silent: true,
    }).catch((e) => console.warn('[appt reject mail]', e));
  }
  await notifyVisitor(ctx.appt, 'Randevu talebin reddedildi', cleanReason ?? 'Ofis randevu talebini onaylayamadı.');
  return { ok: true };
}

/** Ofis: alternatif saat ÖNERİR (örn. 10:00 dolu → 12:00 öner). */
export async function proposeRescheduleAction(appointmentId: string, newIso: string): Promise<ActionResult> {
  const ctx = await loadAppointmentCtx(appointmentId);
  if (!ctx.ok) return ctx;
  if (!ctx.isAgent && !ctx.isAdmin) return { ok: false, error: 'Bu randevu sana ait değil.' };
  if (ctx.appt.status !== 'pending' && ctx.appt.status !== 'rescheduled') {
    return { ok: false, error: 'Bu randevu için yeni saat önerilemez.' };
  }
  const proposed = new Date(newIso);
  if (Number.isNaN(proposed.getTime())) return { ok: false, error: 'Geçersiz tarih.' };
  if (proposed < new Date(Date.now() + 15 * 60 * 1000)) return { ok: false, error: 'Geçmiş bir saat öneremezsin.' };

  await db.update(appointments).set({ status: 'rescheduled', proposedAt: proposed }).where(eq(appointments.id, appointmentId));

  const [agent] = await db.select({ name: users.name }).from(users).where(eq(users.id, ctx.appt.agentId)).limit(1);
  if (ctx.listing) {
    sendEmail({
      to: ctx.appt.visitorEmail,
      subject: `Yeni saat önerildi — ${ctx.listing.title}`,
      html: tplAppointmentRescheduled({
        visitorName: ctx.appt.visitorName,
        agentName: agent?.name ?? 'Ofis',
        listingTitle: ctx.listing.title,
        oldWhen: ctx.appt.scheduledAt,
        newWhen: proposed,
        country: ctx.listing.country,
      }),
      silent: true,
    }).catch((e) => console.warn('[appt reschedule mail]', e));
  }
  await notifyVisitor(ctx.appt, 'Yeni randevu saati önerildi', `${ctx.listing?.title ?? 'İlan'} için ofis yeni bir saat önerdi. Panelinden kabul/ret yapabilirsin.`);
  return { ok: true };
}

/** Ziyaretçi: önerilen alternatif saati KABUL eder. */
export async function acceptRescheduleAction(appointmentId: string): Promise<ActionResult> {
  const ctx = await loadAppointmentCtx(appointmentId);
  if (!ctx.ok) return ctx;
  if (!ctx.isVisitor) return { ok: false, error: 'Bu randevu sana ait değil.' };
  if (ctx.appt.status !== 'rescheduled' || !ctx.appt.proposedAt) {
    return { ok: false, error: 'Kabul edilecek bir öneri yok.' };
  }
  // Önerilen saati slot'a taşı — aynı agent+saat aktif doluysa engelle.
  try {
    await db.update(appointments)
      .set({ scheduledAt: ctx.appt.proposedAt, proposedAt: null, status: 'confirmed' })
      .where(eq(appointments.id, appointmentId));
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === '23505') {
      return { ok: false, error: 'Önerilen saat artık dolu.' };
    }
    throw e;
  }
  await db.insert(notifications).values({
    userId: ctx.appt.agentId,
    type: 'appointment',
    title: 'Önerilen saat kabul edildi',
    body: `${ctx.appt.visitorName} önerdiğin yeni saati kabul etti.`,
    link: '/agent',
  }).catch((e) => console.warn('[appt accept notify]', e));
  return { ok: true };
}

/** Ziyaretçi: randevuyu / öneriyi REDDEDER veya İPTAL eder. */
export async function cancelAppointmentAction(appointmentId: string): Promise<ActionResult> {
  const ctx = await loadAppointmentCtx(appointmentId);
  if (!ctx.ok) return ctx;
  if (!ctx.isVisitor && !ctx.isAgent && !ctx.isAdmin) return { ok: false, error: 'Yetki yok.' };
  if (ctx.appt.status === 'cancelled' || ctx.appt.status === 'completed' || ctx.appt.status === 'rejected') {
    return { ok: false, error: 'Bu randevu zaten kapanmış.' };
  }
  await db.update(appointments).set({ status: 'cancelled', proposedAt: null }).where(eq(appointments.id, appointmentId));
  // Karşı tarafa bildirim
  if (ctx.isVisitor) {
    await db.insert(notifications).values({
      userId: ctx.appt.agentId, type: 'appointment',
      title: 'Randevu iptal edildi', body: `${ctx.appt.visitorName} randevuyu iptal etti.`, link: '/agent',
    }).catch(() => {});
  } else {
    await notifyVisitor(ctx.appt, 'Randevu iptal edildi', 'Ofis randevuyu iptal etti.');
  }
  return { ok: true };
}

/** Ziyaretçinin kendi randevuları (takip sekmesi için). */
export async function getMyAppointments() {
  const me = await getCurrentUser();
  if (!me) return [];
  const rows = await db
    .select({
      id: appointments.id,
      scheduledAt: appointments.scheduledAt,
      proposedAt: appointments.proposedAt,
      status: appointments.status,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      listingTitle: listings.title,
      listingSlug: listings.slug,
      listingCountry: listings.country,
      agentName: users.name,
    })
    .from(appointments)
    .leftJoin(listings, eq(appointments.listingId, listings.id))
    .leftJoin(users, eq(appointments.agentId, users.id))
    .where(eq(appointments.visitorUserId, me.id))
    .orderBy(desc(appointments.scheduledAt))
    .limit(100);
  return rows;
}

/** Ofis (agent): kendi randevuları — yönetim paneli için (PII içerir, sadece sahibi). */
export async function getAgentAppointmentsDetailed() {
  const me = await getCurrentUser();
  if (!me) return [];
  const isAgentRole = me.role === 'agent' || me.role === 'admin' || me.role === 'super_admin';
  if (!isAgentRole) return [];
  const rows = await db
    .select({
      id: appointments.id,
      scheduledAt: appointments.scheduledAt,
      proposedAt: appointments.proposedAt,
      status: appointments.status,
      visitorName: appointments.visitorName,
      visitorEmail: appointments.visitorEmail,
      visitorPhone: appointments.visitorPhone,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      listingTitle: listings.title,
      listingSlug: listings.slug,
      listingCountry: listings.country,
    })
    .from(appointments)
    .leftJoin(listings, eq(appointments.listingId, listings.id))
    .where(eq(appointments.agentId, me.id))
    .orderBy(desc(appointments.scheduledAt))
    .limit(200);
  return rows;
}
