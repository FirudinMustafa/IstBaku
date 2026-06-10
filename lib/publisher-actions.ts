'use server';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/db/client';
import { users, publisherApplications } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getCurrentUser, getCurrentAdmin } from './auth-actions';
import { revalidatePath } from 'next/cache';
import { sanitizeText } from './sanitize';
import { sendEmail, APP_URL } from './email';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);
const BCRYPT_COST = 12;

export async function getPublishers() {
  const user = (await getCurrentAdmin()) ?? (await getCurrentUser());
  if (!user || !ADMIN_ROLES.has(user.role)) return [];

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, 'blog_publisher'))
    .orderBy(desc(users.createdAt));
}

export async function createPublisherAction(input: {
  name: string;
  email: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = (await getCurrentAdmin()) ?? (await getCurrentUser());
  if (!user || !ADMIN_ROLES.has(user.role))
    return { ok: false, error: 'Yetkin yok.' };

  const name = sanitizeText(input.name, { maxLength: 100 });
  if (!name) return { ok: false, error: 'İsim gerekli.' };

  const email = input.email?.trim().toLowerCase();
  if (!email || !email.includes('@'))
    return { ok: false, error: 'Geçerli bir e-posta adresi girin.' };

  const tempPassword = crypto.randomBytes(8).toString('base64url');
  const hash = await bcrypt.hash(tempPassword, BCRYPT_COST);

  try {
    const [created] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: hash,
        role: 'blog_publisher',
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
      })
      .returning({ id: users.id });

    try {
      await sendEmail({
        to: email,
        subject: 'ISTBAKU Blog Yayıncı Hesabınız',
        html: `
          <h2>Merhaba ${name},</h2>
          <p>ISTBAKU blog platformuna yayıncı olarak davet edildiniz.</p>
          <p><strong>Giriş bilgileriniz:</strong></p>
          <ul>
            <li>E-posta: ${email}</li>
            <li>Geçici şifre: <code>${tempPassword}</code></li>
          </ul>
          <p><a href="${APP_URL}/auth/sign-in">Giriş yapmak için tıklayın</a></p>
          <p>Lütfen ilk girişten sonra şifrenizi değiştirin.</p>
        `,
      });
    } catch {
      // e-posta gönderilemese bile hesap oluşturuldu
    }

    revalidatePath('/admin/publishers');
    return { ok: true, id: created.id };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') {
      return { ok: false, error: 'Bu e-posta adresi zaten kayıtlı.' };
    }
    console.error('createPublisher error', err);
    return { ok: false, error: 'Yayıncı oluşturulamadı.' };
  }
}

// ============================================================
// M3 — Blog yazıcı BAŞVURU akışı (kullanıcı başvurur → admin onaylar)
// ============================================================

export async function getMyPublisherApplication(): Promise<{ status: string; role: string }> {
  const me = await getCurrentUser();
  if (!me) return { status: 'none', role: 'guest' };
  const [row] = await db
    .select({ status: publisherApplications.status })
    .from(publisherApplications)
    .where(eq(publisherApplications.userId, me.id))
    .orderBy(desc(publisherApplications.createdAt))
    .limit(1);
  return { status: (row?.status as string) ?? 'none', role: me.role };
}

export async function applyForPublisherAction(note: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: 'Giriş yapmalısın.' };
  if (me.role === 'blog_publisher') return { ok: false, error: 'Zaten blog yazıcısısın.' };
  const clean = sanitizeText(note ?? '', { maxLength: 1000 });
  if (clean.trim().length < 10) return { ok: false, error: 'Lütfen kısa bir tanıtım yaz (en az 10 karakter).' };
  const [existing] = await db
    .select({ id: publisherApplications.id })
    .from(publisherApplications)
    .where(and(eq(publisherApplications.userId, me.id), eq(publisherApplications.status, 'pending')))
    .limit(1);
  if (existing) return { ok: false, error: 'Bekleyen bir başvurun zaten var.' };
  await db.insert(publisherApplications).values({ userId: me.id, note: clean, status: 'pending' });
  revalidatePath('/admin/publishers');
  return { ok: true };
}

export async function getPublisherApplications() {
  const user = (await getCurrentAdmin()) ?? (await getCurrentUser());
  if (!user || !ADMIN_ROLES.has(user.role)) return [];
  return db
    .select({
      id: publisherApplications.id,
      note: publisherApplications.note,
      createdAt: publisherApplications.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(publisherApplications)
    .innerJoin(users, eq(publisherApplications.userId, users.id))
    .where(eq(publisherApplications.status, 'pending'))
    .orderBy(desc(publisherApplications.createdAt));
}

export async function approvePublisherApplicationAction(appId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = (await getCurrentAdmin()) ?? (await getCurrentUser());
  if (!admin || !ADMIN_ROLES.has(admin.role)) return { ok: false, error: 'Yetkin yok.' };
  const [app] = await db.select().from(publisherApplications).where(eq(publisherApplications.id, appId)).limit(1);
  if (!app || app.status !== 'pending') return { ok: false, error: 'Başvuru bulunamadı veya işlenmiş.' };
  await db.update(users).set({ role: 'blog_publisher' }).where(eq(users.id, app.userId));
  await db.update(publisherApplications)
    .set({ status: 'approved', reviewedById: admin.id, reviewedAt: new Date() })
    .where(eq(publisherApplications.id, appId));
  const [u] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, app.userId)).limit(1);
  if (u) {
    sendEmail({
      to: u.email,
      subject: 'Blog Yazıcı Başvurun Onaylandı — ISTBAKU',
      html: `<p>Merhaba ${u.name},</p><p>Blog yazıcı başvurun onaylandı. Artık <a href="${APP_URL}/publisher">Blog Paneli</a>'nden içerik üretebilirsin.</p>`,
      silent: true,
    }).catch(() => {});
  }
  revalidatePath('/admin/publishers');
  return { ok: true };
}

export async function rejectPublisherApplicationAction(appId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = (await getCurrentAdmin()) ?? (await getCurrentUser());
  if (!admin || !ADMIN_ROLES.has(admin.role)) return { ok: false, error: 'Yetkin yok.' };
  await db.update(publisherApplications)
    .set({ status: 'rejected', reviewedById: admin.id, reviewedAt: new Date() })
    .where(and(eq(publisherApplications.id, appId), eq(publisherApplications.status, 'pending')));
  revalidatePath('/admin/publishers');
  return { ok: true };
}

export async function revokePublisherAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = (await getCurrentAdmin()) ?? (await getCurrentUser());
  if (!user || !ADMIN_ROLES.has(user.role))
    return { ok: false, error: 'Yetkin yok.' };

  try {
    await db
      .update(users)
      .set({ role: 'user' })
      .where(eq(users.id, id));

    revalidatePath('/admin/publishers');
    return { ok: true };
  } catch (err) {
    console.error('revokePublisher error', err);
    return { ok: false, error: 'İşlem başarısız.' };
  }
}
