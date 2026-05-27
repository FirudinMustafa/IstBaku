'use server';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
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
