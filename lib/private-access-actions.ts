'use server';

import { db } from '@/db/client';
import { users, notifications, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser, requireAdminRole } from './auth-actions';
import { sendEmail, APP_URL } from './email';
import { revalidatePath } from 'next/cache';

/**
 * Gizli portföy erişim talebi (Tur6 #4c). Kullanıcı KYC onaylı olmalı; talep
 * admin onay kuyruğuna düşer. Akış: none/rejected → requested → (admin) approved.
 */
export async function requestPrivateAccessAction(): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  if (user.kycStatus !== 'approved') return { ok: false, error: 'Önce KYC doğrulamanı tamamla.' };
  if (user.privateAccess === 'approved') return { ok: true };
  if (user.privateAccess === 'requested') return { ok: true };
  try {
    await db.update(users).set({ privateAccess: 'requested' }).where(eq(users.id, user.id));
    // Admin'lere bildirim
    const admins = await db.select({ id: users.id }).from(users)
      .where(eq(users.role, 'super_admin'));
    if (admins.length) {
      await db.insert(notifications).values(admins.map((a) => ({
        userId: a.id,
        type: 'system' as const,
        title: 'Gizli portföy erişim talebi',
        body: `${user.name} (${user.email}) gizli portföy erişimi istedi.`,
        link: '/admin/kyc',
      })));
    }
    await db.insert(auditLog).values({
      actorId: user.id, actorEmail: user.email,
      action: 'Gizli portföy erişimi talep edildi', target: 'private_access',
    });
    revalidatePath('/private-portfolio');
    return { ok: true };
  } catch (err) {
    console.error('requestPrivateAccess', err);
    return { ok: false, error: 'Talep gönderilemedi.' };
  }
}

/** Admin: gizli portföy erişimini onayla/reddet. */
export async function setPrivateAccessAction(
  userId: string, status: 'approved' | 'rejected',
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdminRole(['admin', 'super_admin']);
  if (!admin) return { ok: false, error: 'Yetkisiz.' };
  try {
    const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!target) return { ok: false, error: 'Kullanıcı bulunamadı.' };
    await db.update(users).set({ privateAccess: status }).where(eq(users.id, userId));
    await db.insert(notifications).values({
      userId,
      type: 'system',
      title: status === 'approved' ? 'Gizli portföy erişimin onaylandı' : 'Gizli portföy talebin reddedildi',
      body: status === 'approved'
        ? 'Artık gizli portföy ilanlarını görüntüleyebilirsin.'
        : 'Gizli portföy erişim talebin onaylanmadı.',
      link: status === 'approved' ? '/private-portfolio' : '/dashboard',
    });
    await db.insert(auditLog).values({
      actorId: admin.id, actorEmail: admin.email,
      action: `Gizli portföy erişimi ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`,
      target: 'private_access', meta: { userId },
    });
    sendEmail({
      to: target.email,
      subject: status === 'approved' ? 'Gizli portföy erişimin onaylandı — İstBaku' : 'Gizli portföy talebin — İstBaku',
      html: status === 'approved'
        ? `<p>Merhaba ${target.name},</p><p>Gizli portföy erişimin onaylandı.</p><p><a href="${APP_URL}/private-portfolio">Gizli portföyü gör</a></p>`
        : `<p>Merhaba ${target.name},</p><p>Gizli portföy erişim talebin şu an onaylanmadı.</p>`,
      silent: true,
    }).catch((e) => console.warn('[private-access mail]', e));
    revalidatePath('/admin/kyc');
    return { ok: true };
  } catch (err) {
    console.error('setPrivateAccess', err);
    return { ok: false, error: 'İşlem başarısız.' };
  }
}

/** Admin: bekleyen gizli portföy talepleri. */
export async function getPendingPrivateAccessAction(): Promise<{ id: string; name: string; email: string }[]> {
  const admin = await requireAdminRole(['admin', 'super_admin']);
  if (!admin) return [];
  const rows = await db.select({ id: users.id, name: users.name, email: users.email })
    .from(users).where(eq(users.privateAccess, 'requested'));
  return rows;
}
