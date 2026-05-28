'use server';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/db/client';
import { users, emailVerificationTokens } from '@/db/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';
import { getSession } from './session';
import { getCurrentUser } from './auth-actions';
import { sendEmail, tplVerifyEmail } from './email';
import { sanitizePhone } from './sanitize';
import { stripCrlf } from './security';

const BCRYPT_COST = 12;
const PG_UNIQUE_VIOLATION = '23505';
function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === PG_UNIQUE_VIOLATION);
}

export interface MyAccount {
  name: string;
  email: string;
  phoneDial: string;
  phone: string;
  emailVerified: boolean;
}

export async function getMyAccount(): Promise<MyAccount | null> {
  const cur = await getCurrentUser();
  if (!cur) return null;
  const [u] = await db.select().from(users).where(eq(users.id, cur.id)).limit(1);
  if (!u) return null;
  return {
    name: u.name,
    email: u.email,
    phoneDial: u.phoneDial ?? '',
    phone: u.phone ?? '',
    emailVerified: u.emailVerified,
  };
}

/** Ad + telefon güncelle. */
export async function updateProfileAction(input: {
  name: string;
  phoneDial: string;
  phone: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cur = await getCurrentUser();
  if (!cur) return { ok: false, error: 'Giriş yapmalısın.' };

  const name = stripCrlf(input.name).trim();
  if (name.length < 2) return { ok: false, error: 'Ad en az 2 karakter olmalı.' };

  const combined = `${(input.phoneDial ?? '').replace(/[^\d+]/g, '')}${input.phone}`;
  const normalized = sanitizePhone(combined);
  if (!normalized) return { ok: false, error: 'Geçerli bir telefon gir (örn. +90 5xx...).' };

  try {
    await db.update(users)
      .set({ name, phoneDial: input.phoneDial, phone: normalized.replace(/^\+/, ''), updatedAt: new Date() })
      .where(eq(users.id, cur.id));
    // Oturumdaki adı da güncelle.
    const session = await getSession();
    if (session.userId === cur.id) {
      session.name = name;
      await session.save();
    }
    return { ok: true };
  } catch (err) {
    console.error('updateProfile', err);
    return { ok: false, error: 'Güncellenemedi.' };
  }
}

/** Şifre değiştir — mevcut şifre teyidiyle. */
export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cur = await getCurrentUser();
  if (!cur) return { ok: false, error: 'Giriş yapmalısın.' };
  if (input.newPassword.length < 8) return { ok: false, error: 'Yeni şifre en az 8 karakter olmalı.' };

  try {
    const [u] = await db.select().from(users).where(eq(users.id, cur.id)).limit(1);
    if (!u) return { ok: false, error: 'Kullanıcı bulunamadı.' };
    const ok = await bcrypt.compare(input.currentPassword, u.passwordHash);
    if (!ok) return { ok: false, error: 'Mevcut şifre hatalı.' };
    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, cur.id));
    return { ok: true };
  } catch (err) {
    console.error('changePassword', err);
    return { ok: false, error: 'Şifre değiştirilemedi.' };
  }
}

/**
 * E-posta değiştir — şifre teyidi sonrası yeni adrese 6 haneli doğrulama kodu gönderir.
 * Yeni e-posta `emailVerified=false` olarak kaydedilir; kullanıcı kodu girip
 * `verifyCodeAction(newEmail, code)` ile doğrular (proje politikası: e-posta-only doğrulama).
 */
export async function changeEmailAction(input: {
  newEmail: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cur = await getCurrentUser();
  if (!cur) return { ok: false, error: 'Giriş yapmalısın.' };

  const newEmail = input.newEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return { ok: false, error: 'Geçersiz e-posta.' };
  if (newEmail === cur.email.toLowerCase()) return { ok: false, error: 'Bu zaten mevcut e-postan.' };

  try {
    const [u] = await db.select().from(users).where(eq(users.id, cur.id)).limit(1);
    if (!u) return { ok: false, error: 'Kullanıcı bulunamadı.' };
    const pwOk = await bcrypt.compare(input.password, u.passwordHash);
    if (!pwOk) return { ok: false, error: 'Şifre hatalı.' };

    // Başka kullanıcıda var mı?
    const [taken] = await db.select({ id: users.id }).from(users)
      .where(and(sql`lower(${users.email}) = ${newEmail}`, sql`${users.id} <> ${cur.id}`))
      .limit(1);
    if (taken) return { ok: false, error: 'Bu e-posta başka bir hesapta kayıtlı.' };

    // E-postayı değiştir + doğrulanmamış işaretle.
    try {
      await db.update(users)
        .set({ email: newEmail, emailVerified: false, updatedAt: new Date() })
        .where(eq(users.id, cur.id));
    } catch (e) {
      if (isUniqueViolation(e)) return { ok: false, error: 'Bu e-posta başka bir hesapta kayıtlı.' };
      throw e;
    }

    // Önceki kullanılmamış kodları geçersiz kıl, yeni kod üret.
    await db.update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(emailVerificationTokens.userId, cur.id), isNull(emailVerificationTokens.usedAt)));

    const token = crypto.randomBytes(32).toString('base64url');
    const code = String(crypto.randomInt(100000, 1000000));
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await db.insert(emailVerificationTokens).values({
      token, code, userId: cur.id, email: newEmail, expiresAt: expires,
    });

    // Oturumdaki e-postayı da güncelle.
    const session = await getSession();
    if (session.userId === cur.id) {
      session.email = newEmail;
      await session.save();
    }

    sendEmail({
      to: newEmail,
      subject: `ISTBAKU — Doğrulama kodun: ${code}`,
      html: tplVerifyEmail({ name: u.name, code }),
      silent: true,
    }).catch((e) => console.warn('[changeEmail mail]', e));

    return { ok: true };
  } catch (err) {
    console.error('changeEmail', err);
    return { ok: false, error: 'E-posta değiştirilemedi.' };
  }
}
