'use server';

import { db } from '@/db/client';
import { auditLog, notifications, users } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { sendEmail, APP_URL } from './email';
import { sanitizeText } from './sanitize';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface DemoRequestInput {
  name: string;
  email: string;
  company?: string;
  message?: string;
}

/**
 * B2B "Demo Talep Et" formu — admin'e bildirim + destek e-postası (Tur6 #1d).
 * Girişe gerek yok (potansiyel kurumsal müşteri).
 */
export async function submitDemoRequestAction(
  input: DemoRequestInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = sanitizeText(input.name ?? '', { maxLength: 120 });
  const email = (input.email ?? '').trim().toLowerCase();
  const company = input.company ? sanitizeText(input.company, { maxLength: 160 }) : '';
  const message = input.message ? sanitizeText(input.message, { maxLength: 1000 }) : '';

  if (name.length < 2) return { ok: false, error: 'İsim gerekli.' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Geçerli e-posta gir.' };

  try {
    const summary = `Demo talebi — ${name}${company ? ` (${company})` : ''} · ${email}${message ? ` · ${message}` : ''}`;

    // Admin'lere in-app bildirim
    const admins = await db.select({ id: users.id }).from(users)
      .where(inArray(users.role, ['admin', 'super_admin']));
    if (admins.length) {
      await db.insert(notifications).values(
        admins.map((a) => ({
          userId: a.id,
          type: 'system' as const,
          title: 'Yeni B2B demo talebi',
          body: summary,
          link: '/admin',
        })),
      );
    }

    await db.insert(auditLog).values({
      actorId: null,
      actorEmail: email,
      action: 'B2B demo talebi',
      target: 'reports',
      meta: { name, email, company, message },
    });

    // Destek e-postası (sessiz — Resend yoksa atlanır)
    sendEmail({
      to: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] || 'info@istbaku.com',
      subject: `Yeni B2B demo talebi — ${name}`,
      html: `<p><strong>${name}</strong>${company ? ` / ${company}` : ''}</p><p>E-posta: ${email}</p>${message ? `<p>${message}</p>` : ''}<p><a href="${APP_URL}/admin">Admin panel</a></p>`,
      silent: true,
    }).catch((e) => console.warn('[demo-request mail]', e));

    return { ok: true };
  } catch (err) {
    console.error('submitDemoRequest error', err);
    return { ok: false, error: 'Talep gönderilemedi. Lütfen tekrar dene.' };
  }
}
