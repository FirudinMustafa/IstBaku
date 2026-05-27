'use server';

import { db } from '@/db/client';
import { appointments, listings, users, notifications } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { sendEmail, tplAppointmentVisitor, tplAppointmentAgent, APP_URL } from './email';
import { sanitizeText, sanitizePhone } from './sanitize';

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
    const [listing] = await db.select({ id: listings.id, title: listings.title, slug: listings.slug, agentId: listings.agentId })
      .from(listings).where(eq(listings.id, input.listingId)).limit(1);
    if (!listing) return { ok: false, error: 'İlan bulunamadı.' };

    // MC-09 / MC-15: atomic insert. Unique index (agent_id, scheduled_at) blocks
    // duplicates; .onConflictDoNothing() turns the race loser into a graceful
    // "slot taken" response.
    const inserted = await db.insert(appointments).values({
      listingId: input.listingId,
      agentId: input.agentId,
      visitorUserId: me.id,
      visitorName: name,
      visitorEmail: email,
      visitorPhone: phone ?? undefined,
      scheduledAt,
      status: 'confirmed',
      notes: notes ?? undefined,
    }).onConflictDoNothing({
      target: [appointments.agentId, appointments.scheduledAt],
    }).returning();

    if (inserted.length === 0) {
      return { ok: false, error: 'Bu saat dolu. Lütfen başka bir saat seç.' };
    }
    const a = inserted[0];

    const propertyUrl = `${APP_URL}/property/${listing.slug}`;
    const dashboardUrl = `${APP_URL}/agent`;

    // Ziyaretçiye onay maili
    sendEmail({
      to: email,
      subject: `Randevun onaylandı — ${listing.title}`,
      html: tplAppointmentVisitor({
        visitorName: name,
        agentName: agentRow.name,
        listingTitle: listing.title,
        when: scheduledAt,
        propertyUrl,
      }),
      silent: true,
    }).catch((e) => console.warn('[appt visitor mail]', e));

    // Ajana lead bildirimi
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
      }),
      silent: true,
    }).catch((e) => console.warn('[appt agent mail]', e));

    // Ajana in-app bildirim
    await db.insert(notifications).values({
      userId: listing.agentId!,
      type: 'appointment',
      title: 'Yeni gezinti randevusu',
      body: `${name} — ${listing.title} için ${scheduledAt.toLocaleDateString('tr-TR')} tarihli randevu oluşturdu.`,
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
      ));
    return { ok: true, slots: rows.map((r) => r.at.toISOString()) };
  } catch (err) {
    console.error('getBookedSlots', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}
