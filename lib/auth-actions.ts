'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/db/client';
import { users, emailVerificationTokens, passwordResetTokens, type DbUser } from '@/db/schema';
import { eq, sql, and, gt, isNull, desc } from 'drizzle-orm';
import { getSession } from './session';
import {
  sendEmail, tplVerifyEmail, tplWelcome, tplPasswordReset, APP_URL,
} from './email';
import {
  rateLimit, recordFailure, clearFailures, isBlocked,
  LIMITS, OTP_MAX_FAILURES, OTP_BLOCK_MS,
} from './rate-limit';
import { padToMinDuration, stripCrlf } from './security';
import { sanitizePhone } from './sanitize';

// MH-26: Postgres unique-violation SQLSTATE.
const PG_UNIQUE_VIOLATION = '23505';
function isUniqueViolation(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    return (err as { code?: string }).code === PG_UNIQUE_VIOLATION;
  }
  return false;
}

// MH-03: bcrypt cost bumped from 10 → 12 (recommended baseline for 2026).
const BCRYPT_COST = 12;
// MH-02: timing-attack pad — every sign-in / forgot-pwd path takes at least
// this long, regardless of whether the user exists.
const AUTH_MIN_DURATION_MS = 250;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: DbUser['role'];
  premium: boolean;
  emailVerified: boolean;
  kycStatus: DbUser['kycStatus'];
  avatar: string | null;
  createdAt: string;
}

function toPublic(u: DbUser): PublicUser {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    premium: u.premium, emailVerified: u.emailVerified, kycStatus: u.kycStatus,
    avatar: u.avatar, createdAt: u.createdAt.toISOString(),
  };
}

function genToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function gen6DigitCode(): string {
  // 100000 - 999999 (6 hane, baştaki sıfırlar yok)
  return String(crypto.randomInt(100000, 1000000));
}

// ============================================================
// SIGN UP
// ============================================================

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  phoneDial: string;
  phone: string;
  // PB-03: public-signup role selector. Whitelist: 'user' | 'agent' | 'office'.
  // Anything else is coerced to 'user' so privilege escalation is impossible
  // via crafted payloads. `office` maps to the `agent` DB role with a flag
  // for now (kept as an agent variant until the office-specific profile
  // table lands; we tag the audit log so the segment stays queryable).
  role?: 'user' | 'agent' | 'office';
}

export async function signUpAction(
  input: SignUpInput,
): Promise<{ ok: true; user: PublicUser } | { ok: false; error: string }> {
  // MC-26 / C-04 / H-07: strip CR/LF + bidi marks + control chars from name.
  const name = stripCrlf(input.name).trim();
  const email = input.email.trim().toLowerCase();

  if (name.length < 2) return { ok: false, error: 'Ad en az 2 karakter olmalı.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Geçersiz e-posta.' };
  if (input.password.length < 8) return { ok: false, error: 'Şifre en az 8 karakter olmalı.' };

  // MH-14: E.164-ish phone validation. Combine dial+number so a stand-alone
  // 0XXX local number still gets a country prefix before validation.
  const combinedPhone = `${(input.phoneDial ?? '').replace(/[^\d+]/g, '')}${input.phone}`;
  const normalizedPhone = sanitizePhone(combinedPhone);
  if (!normalizedPhone) return { ok: false, error: 'Geçersiz telefon (E.164 formatı bekleniyor).' };

  // MC-05: rate limit per email — 5 / hour.
  const rl = rateLimit(`signup:${email}`, LIMITS.signUp.limit, LIMITS.signUp.windowMs);
  if (!rl.ok) return { ok: false, error: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar dene.' };

  try {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f97316,fb923c,ea580c&textColor=ffffff`;

    // PB-03: derive a safe role from the optional input. Anything outside the
    // public whitelist falls back to 'user'. `office` is persisted as `agent`
    // (the closest existing DB role) — we keep a marker in the bio so admin
    // tools can split them later without a schema migration. NEVER trust the
    // caller for admin/super_admin/moderator.
    const ALLOWED_PUBLIC_ROLES = ['user', 'agent', 'office'] as const;
    const rawRole = (input.role ?? 'user') as string;
    const safeIntent: 'user' | 'agent' | 'office' = (
      ALLOWED_PUBLIC_ROLES as readonly string[]
    ).includes(rawRole)
      ? (rawRole as 'user' | 'agent' | 'office')
      : 'user';
    const persistedRole: DbUser['role'] = safeIntent === 'user' ? 'user' : 'agent';
    const officeMarker = safeIntent === 'office' ? '[office]' : null;

    // MH-26: rely on the DB unique index for atomic duplicate detection;
    // pre-check + insert is TOCTOU racy. The catch below translates 23505.
    let created;
    try {
      const result = await db.insert(users).values({
        name, email, passwordHash,
        phoneDial: input.phoneDial,
        phone: normalizedPhone.replace(/^\+/, ''),
        avatar,
        role: persistedRole,
        bio: officeMarker,
        status: 'active',
        emailVerified: false,
      }).returning();
      created = result[0];
    } catch (insertErr) {
      if (isUniqueViolation(insertErr)) {
        return { ok: false, error: 'Bu e-posta zaten kayıtlı. Giriş yap.' };
      }
      throw insertErr;
    }

    // Auto sign-in YOK — kullanıcı önce e-postasını doğrulamalı, sonra login sayfasından girer.

    // 6 haneli doğrulama kodu + mail (15 dakika geçerli)
    const token = genToken();
    const code = gen6DigitCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await db.insert(emailVerificationTokens).values({
      token, code, userId: created.id, email: created.email, expiresAt: expires,
    });
    sendEmail({
      to: created.email,
      subject: `ISTBAKU — Doğrulama kodun: ${code}`,
      html: tplVerifyEmail({ name: created.name, code }),
      silent: true,
    }).catch((e) => console.warn('[signUp mail]', e));

    return { ok: true, user: toPublic(created) };
  } catch (err) {
    console.error('signUp error', err);
    return { ok: false, error: 'Sunucu hatası. Lütfen tekrar dene.' };
  }
}

// ============================================================
// VERIFY EMAIL (token-based)
// ============================================================

/**
 * Kullanıcının girdiği 6-haneli kodu doğrular, hesabı aktive eder.
 * Başarılıysa hoş geldin maili tetiklenir. Kullanıcı oturum açılmaz —
 * akabinde /auth/sign-in'e yönlenip kendi şifresiyle giriş yapar.
 */
export async function verifyCodeAction(
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normEmail = email.trim().toLowerCase();
  const normCode = code.trim();
  if (!/^[0-9]{6}$/.test(normCode)) return { ok: false, error: 'Kod 6 rakamdan oluşmalı.' };

  // MC-05: per-email rate limit on verify attempts (10 / 15min).
  const rl = rateLimit(`verify:${normEmail}`, LIMITS.verifyCode.limit, LIMITS.verifyCode.windowMs);
  if (!rl.ok) return { ok: false, error: 'Çok fazla deneme. Lütfen bir süre sonra tekrar dene.' };

  // MC-06: hard-lock per-email after N consecutive failures (5 → 15min block).
  const blockKey = `otp:${normEmail}`;
  const block = isBlocked(blockKey);
  if (block.blocked) {
    return { ok: false, error: 'Çok fazla yanlış kod. 15 dakika sonra tekrar dene.' };
  }

  try {
    const [user] = await db.select().from(users)
      .where(sql`lower(${users.email}) = ${normEmail}`)
      .limit(1);
    if (!user) {
      recordFailure(blockKey, OTP_MAX_FAILURES, OTP_BLOCK_MS);
      return { ok: false, error: 'Bu e-postaya ait kayıt bulunamadı.' };
    }
    if (user.emailVerified) {
      clearFailures(blockKey);
      return { ok: true };
    }

    const [row] = await db.select().from(emailVerificationTokens)
      .where(and(
        eq(emailVerificationTokens.userId, user.id),
        eq(emailVerificationTokens.code, normCode),
        gt(emailVerificationTokens.expiresAt, new Date()),
        isNull(emailVerificationTokens.usedAt),
      ))
      .orderBy(desc(emailVerificationTokens.createdAt))
      .limit(1);
    if (!row) {
      const f = recordFailure(blockKey, OTP_MAX_FAILURES, OTP_BLOCK_MS);
      if (f.blocked) return { ok: false, error: 'Çok fazla yanlış kod. 15 dakika sonra tekrar dene.' };
      return { ok: false, error: 'Kod yanlış veya süresi dolmuş.' };
    }

    await db.update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await db.update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.token, row.token));
    // MC-06: invalidate any other still-unused codes for this user.
    await db.update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(and(
        eq(emailVerificationTokens.userId, user.id),
        isNull(emailVerificationTokens.usedAt),
      ));

    clearFailures(blockKey);

    sendEmail({
      to: user.email,
      subject: 'ISTBAKU — Aramıza hoş geldin',
      html: tplWelcome({ name: user.name }),
      silent: true,
    }).catch((e) => console.warn('[welcome mail]', e));

    return { ok: true };
  } catch (err) {
    console.error('verifyCodeAction', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

export async function verifyEmailWithToken(
  rawToken: string,
): Promise<{ ok: boolean; error?: string; emailJustVerified?: boolean }> {
  if (!rawToken || rawToken.length < 16) return { ok: false, error: 'Geçersiz token.' };
  try {
    // MH-10: single atomic claim — UPDATE … WHERE usedAt IS NULL AND expiresAt > now RETURNING *.
    // Race-free: only one concurrent request can flip usedAt from NULL.
    const claimed = await db.update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(and(
        eq(emailVerificationTokens.token, rawToken),
        gt(emailVerificationTokens.expiresAt, new Date()),
        isNull(emailVerificationTokens.usedAt),
      ))
      .returning();
    if (claimed.length === 0) return { ok: false, error: 'Bu link süresi dolmuş veya geçersiz.' };

    const row = claimed[0];
    const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
    if (!user) return { ok: false, error: 'Kullanıcı bulunamadı.' };

    const justVerified = !user.emailVerified;

    await db.update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, row.userId));

    // Hoş geldin (yalnızca ilk doğrulamada)
    if (justVerified) {
      sendEmail({
        to: user.email,
        subject: 'ISTBAKU — Aramıza hoş geldin',
        html: tplWelcome({ name: user.name }),
        silent: true,
      }).catch((e) => console.warn('[welcome mail]', e));
    }

    return { ok: true, emailJustVerified: justVerified };
  } catch (err) {
    console.error('verifyEmailWithToken', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

/** Doğrulama kodunu e-posta ile yeniden gönder. Email tabanlı (oturum gerekmez). */
export async function resendVerificationCodeAction(rawEmail: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Geçersiz e-posta.' };

  // MC-05: rate limit forgot/resend to 3 / hour per email (shared with forgot-pwd policy).
  const rl = rateLimit(`resend:${email}`, LIMITS.forgotPwd.limit, LIMITS.forgotPwd.windowMs);
  if (!rl.ok) return { ok: false, error: 'Çok fazla istek. Lütfen daha sonra tekrar dene.' };

  try {
    const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
    // Güvenlik: hesap yoksa veya zaten doğrulanmışsa sızdırma
    if (!user || user.emailVerified) return { ok: true };

    // MC-06: invalidate ALL prior unused codes before issuing a new one.
    await db.update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(and(
        eq(emailVerificationTokens.userId, user.id),
        isNull(emailVerificationTokens.usedAt),
      ));

    const token = genToken();
    const code = gen6DigitCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await db.insert(emailVerificationTokens).values({
      token, code, userId: user.id, email: user.email, expiresAt: expires,
    });
    await sendEmail({
      to: user.email,
      subject: `ISTBAKU — Doğrulama kodun: ${code}`,
      html: tplVerifyEmail({ name: user.name, code }),
      silent: true,
    });
    return { ok: true };
  } catch (err) {
    console.error('resendVerificationCode', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

// ============================================================
// SIGN IN
// ============================================================

export async function signInAction(
  email: string,
  password: string,
): Promise<{ ok: true; user: PublicUser } | { ok: false; error: string }> {
  email = email.trim().toLowerCase();
  if (!email || !password) return { ok: false, error: 'E-posta ve şifre gerekli.' };

  // MC-05: rate limit sign-in per email (10 / 15min).
  const rl = rateLimit(`signin:${email}`, LIMITS.signIn.limit, LIMITS.signIn.windowMs);
  if (!rl.ok) return { ok: false, error: 'Çok fazla giriş denemesi. Lütfen daha sonra tekrar dene.' };

  // MH-02: pad every code path to a constant minimum duration so attackers
  // can't distinguish "user not found" from "wrong password" via timing.
  return padToMinDuration((async () => {
    try {
      const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
      if (!user) return { ok: false, error: 'E-posta veya şifre hatalı.' } as const;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return { ok: false, error: 'E-posta veya şifre hatalı.' } as const;

      if (user.status === 'suspended') return { ok: false, error: 'Hesabın askıya alınmış.' } as const;
      if (!user.emailVerified) return { ok: false, error: 'E-postanı doğrula. Kayıt sırasında gönderdiğimiz 6 haneli kodu kayıt sayfasında gir.' } as const;

      // MC-29: regenerate session on successful auth (session fixation defence).
      const session = await getSession();
      session.destroy();
      const fresh = await getSession();
      fresh.userId = user.id;
      fresh.email = user.email;
      fresh.name = user.name;
      fresh.role = user.role;
      fresh.adminScope = false;
      await fresh.save();

      await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));

      return { ok: true, user: toPublic(user) } as const;
    } catch (err) {
      console.error('signIn error', err);
      return { ok: false, error: 'Sunucu hatası. Lütfen tekrar dene.' } as const;
    }
  })(), AUTH_MIN_DURATION_MS);
}

// ============================================================
// FORGOT / RESET PASSWORD
// ============================================================

export async function forgotPasswordAction(
  rawEmail: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Geçersiz e-posta.' };
  }

  // MC-05: rate limit forgot-pwd to 3 / hour per email.
  const rl = rateLimit(`forgot:${email}`, LIMITS.forgotPwd.limit, LIMITS.forgotPwd.windowMs);
  if (!rl.ok) {
    // Still respond ok to avoid enumeration via rate-limit signal.
    return { ok: true };
  }

  // MH-02: pad to constant duration so attacker can't enumerate users.
  return padToMinDuration((async () => {
    try {
      const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
      // Güvenlik: kullanıcı varlığını sızdırmayalım → her zaman ok dön
      if (!user) return { ok: true } as const;

      // Invalidate previously-outstanding tokens before issuing a new one.
      await db.update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt),
        ));

      const token = genToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await db.insert(passwordResetTokens).values({
        token, userId: user.id, expiresAt: expires,
      });
      const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: 'ISTBAKU — Şifre sıfırlama linki',
        html: tplPasswordReset({ name: user.name, resetUrl }),
        silent: true,
      });
      return { ok: true } as const;
    } catch (err) {
      console.error('forgotPassword', err);
      return { ok: false, error: 'Sunucu hatası.' } as const;
    }
  })(), AUTH_MIN_DURATION_MS);
}

export async function resetPasswordAction(
  rawToken: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 8) return { ok: false, error: 'Şifre en az 8 karakter olmalı.' };
  try {
    // MH-10: single atomic claim — UPDATE ... WHERE usedAt IS NULL AND expiresAt > now RETURNING *.
    const claimed = await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(
        eq(passwordResetTokens.token, rawToken),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt),
      ))
      .returning();
    if (claimed.length === 0) return { ok: false, error: 'Link süresi dolmuş veya geçersiz.' };
    const row = claimed[0];

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, row.userId));

    return { ok: true };
  } catch (err) {
    console.error('resetPassword', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

// ============================================================
// SIGN OUT
// ============================================================

export async function signOutAction() {
  const session = await getSession();
  session.destroy();
}

export async function signOutAndRedirect(path = '/') {
  await signOutAction();
  redirect(path);
}

// ============================================================
// CURRENT USER (RSC / server-side)
// ============================================================

export async function getCurrentUser(): Promise<PublicUser | null> {
  const session = await getSession();
  if (!session.userId || session.adminScope) return null;
  try {
    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    return user ? toPublic(user) : null;
  } catch (err) {
    console.error('getCurrentUser error', err);
    return null;
  }
}

// ============================================================
// ADMIN auth
// ============================================================

export async function adminSignInAction(email: string, password: string): Promise<{ ok: boolean; error?: string; name?: string; role?: string }> {
  email = email.trim().toLowerCase();
  if (!email || !password) return { ok: false, error: 'E-posta ve şifre gerekli.' };

  // MC-05: rate limit admin sign-in.
  const rl = rateLimit(`adminsignin:${email}`, LIMITS.signIn.limit, LIMITS.signIn.windowMs);
  if (!rl.ok) return { ok: false, error: 'Çok fazla giriş denemesi. Lütfen daha sonra tekrar dene.' };

  return padToMinDuration((async () => {
    try {
      const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
      // PB-02 / PF-14: collapse all "you can't sign in here" branches into a
      // single generic error so admin email addresses aren't enumerable.
      if (!user) return { ok: false, error: 'E-posta veya şifre hatalı.' } as const;
      const passwordOk = await bcrypt.compare(password, user.passwordHash);
      if (!passwordOk) return { ok: false, error: 'E-posta veya şifre hatalı.' } as const;
      if (!['admin', 'super_admin', 'moderator'].includes(user.role)) {
        return { ok: false, error: 'E-posta veya şifre hatalı.' } as const;
      }

      // MC-29: rotate session on admin login.
      const session = await getSession();
      session.destroy();
      const fresh = await getSession();
      fresh.userId = user.id;
      fresh.email = user.email;
      fresh.name = user.name;
      fresh.role = user.role;
      fresh.adminScope = true;
      await fresh.save();

      return { ok: true, name: user.name, role: user.role } as const;
    } catch (err) {
      console.error('adminSignIn error', err);
      return { ok: false, error: 'Sunucu hatası.' } as const;
    }
  })(), AUTH_MIN_DURATION_MS);
}

export async function getCurrentAdmin(): Promise<{ id: string; name: string; email: string; role: string } | null> {
  const session = await getSession();
  if (!session.userId || !session.adminScope) return null;
  return {
    id: session.userId,
    name: session.name ?? '',
    email: session.email ?? '',
    role: session.role ?? '',
  };
}
