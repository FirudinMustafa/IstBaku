'use server';

import { db } from '@/db/client';
import * as s from '@/db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { getCurrentAdmin } from './auth-actions';
import {
  sendEmail, tplListingApproved, tplListingRejected,
  tplKycApproved, tplKycRejected,
  tplAccountSuspended, tplAccountReactivated, tplAbuseResolved, APP_URL,
} from './email';

type AdminCtx = NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>;

/**
 * MH-05: Generic gate — any admin/moderator/super_admin role.
 * Use the more specific helpers below for sensitive operations.
 */
async function requireAdmin(): Promise<AdminCtx> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error('Yetki yok');
  return admin;
}

/**
 * MH-05 / MH-06: super_admin only. Use this for cross-admin operations
 * (suspending another admin, deleting platform-wide content, resetting roles).
 */
async function requireSuperAdmin(): Promise<AdminCtx> {
  const admin = await requireAdmin();
  if (admin.role !== 'super_admin') {
    throw new Error('Bu işlem yalnızca süper admin tarafından yapılabilir.');
  }
  return admin;
}

/**
 * MH-06: moderator or higher. Moderator's allowed actions are limited to
 * content moderation: approve listings, review KYC, resolve abuse reports.
 */
async function requireModeratorOrAbove(): Promise<AdminCtx> {
  const admin = await requireAdmin();
  if (!['moderator', 'admin', 'super_admin'].includes(admin.role)) {
    throw new Error('Yetki yok.');
  }
  return admin;
}

// ----- Listings approval -----
export async function approveListingAction(listingId: string, level: 1 | 2 | 3 = 2) {
  const admin = await requireModeratorOrAbove();
  if (![1, 2, 3].includes(level)) {
    return { ok: false, error: 'Geçersiz seviye.' };
  }
  await db.update(s.listings).set({
    approvalStatus: 'approved',
    istbakuApproved: true,
    approvalLevel: level,
    aiVerified: true,
    updatedAt: new Date(),
  }).where(eq(s.listings.id, listingId));
  await db.update(s.approvalRequests).set({
    status: 'approved',
    reviewedById: admin.id,
    reviewedAt: new Date(),
  }).where(and(eq(s.approvalRequests.listingId, listingId), eq(s.approvalRequests.status, 'pending')));
  await db.insert(s.auditLog).values({
    actorId: admin.id, actorEmail: admin.email,
    action: 'İlan onaylandı', target: listingId,
    meta: { level },
  });

  // Ajana mail
  const [listing] = await db.select({ title: s.listings.title, slug: s.listings.slug, agentId: s.listings.agentId })
    .from(s.listings).where(eq(s.listings.id, listingId)).limit(1);
  if (listing?.agentId) {
    const [agent] = await db.select({ name: s.users.name, email: s.users.email })
      .from(s.users).where(eq(s.users.id, listing.agentId)).limit(1);
    if (agent) {
      await db.insert(s.notifications).values({
        userId: listing.agentId,
        type: 'approval',
        title: `İlanın onaylandı: ${listing.title}`,
        body: `ISTBAKU Onaylı (Seviye ${level}) rozetiyle yayında.`,
        link: `/property/${listing.slug}`,
      });
      sendEmail({
        to: agent.email,
        subject: `İlanın yayında! — ${listing.title}`,
        html: tplListingApproved({
          agentName: agent.name,
          listingTitle: listing.title,
          listingUrl: `${APP_URL}/property/${listing.slug}`,
          level,
        }),
        silent: true,
      }).catch((e) => console.warn('[approve mail]', e));
    }
  }

  return { ok: true };
}

export async function rejectListingAction(listingId: string, reason?: string) {
  const admin = await requireModeratorOrAbove();
  await db.update(s.listings).set({ approvalStatus: 'rejected', updatedAt: new Date() }).where(eq(s.listings.id, listingId));
  await db.update(s.approvalRequests).set({
    status: 'rejected',
    reviewedById: admin.id,
    reviewedAt: new Date(),
    notes: reason,
  }).where(and(eq(s.approvalRequests.listingId, listingId), eq(s.approvalRequests.status, 'pending')));
  await db.insert(s.auditLog).values({
    actorId: admin.id, actorEmail: admin.email,
    action: 'İlan reddedildi', target: listingId,
    meta: { reason },
  });

  const [listing] = await db.select({ title: s.listings.title, agentId: s.listings.agentId })
    .from(s.listings).where(eq(s.listings.id, listingId)).limit(1);
  if (listing?.agentId) {
    const [agent] = await db.select({ name: s.users.name, email: s.users.email })
      .from(s.users).where(eq(s.users.id, listing.agentId)).limit(1);
    if (agent) {
      await db.insert(s.notifications).values({
        userId: listing.agentId,
        type: 'approval',
        title: `İlanın yayınlanamadı: ${listing.title}`,
        body: reason ?? 'Lütfen detayları gözden geçir ve tekrar gönder.',
        link: '/dashboard?tab=listings',
      });
      sendEmail({
        to: agent.email,
        subject: `İlanın yayınlanmadı — ${listing.title}`,
        html: tplListingRejected({
          agentName: agent.name,
          listingTitle: listing.title,
          reason,
          dashboardUrl: `${APP_URL}/dashboard?tab=listings`,
        }),
        silent: true,
      }).catch((e) => console.warn('[reject mail]', e));
    }
  }

  return { ok: true };
}

export async function getApprovalQueueAction(status: 'pending' | 'approved' | 'rejected' = 'pending') {
  await requireModeratorOrAbove();
  return db.select({
    request: s.approvalRequests,
    listing: s.listings,
  })
    .from(s.approvalRequests)
    .innerJoin(s.listings, eq(s.approvalRequests.listingId, s.listings.id))
    .where(and(eq(s.approvalRequests.status, status), isNull(s.listings.deletedAt)))
    .orderBy(desc(s.approvalRequests.createdAt))
    .limit(100);
}

// ----- KYC (moderator+ allowed) -----
export async function approveKycAction(kycId: string) {
  const admin = await requireModeratorOrAbove();
  const [kyc] = await db.select().from(s.kycRequests).where(eq(s.kycRequests.id, kycId)).limit(1);
  if (!kyc) return { ok: false };
  await db.update(s.kycRequests).set({
    status: 'approved',
    reviewedById: admin.id,
    reviewedAt: new Date(),
  }).where(eq(s.kycRequests.id, kycId));
  await db.update(s.users).set({ kycStatus: 'approved' }).where(eq(s.users.id, kyc.userId));
  await db.insert(s.auditLog).values({
    actorId: admin.id, actorEmail: admin.email,
    action: 'KYC onaylandı', target: kyc.userId,
  });

  const [u] = await db.select({ name: s.users.name, email: s.users.email })
    .from(s.users).where(eq(s.users.id, kyc.userId)).limit(1);
  if (u) {
    await db.insert(s.notifications).values({
      userId: kyc.userId, type: 'kyc',
      title: 'KYC doğrulaman tamamlandı', body: 'Gizli portföy + premium tier artık açık.',
      link: '/dashboard',
    });
    sendEmail({
      to: u.email,
      subject: 'KYC doğrulaman tamamlandı',
      html: tplKycApproved({ name: u.name, dashboardUrl: `${APP_URL}/dashboard` }),
      silent: true,
    }).catch((e) => console.warn('[kyc approve mail]', e));
  }

  return { ok: true };
}

export async function rejectKycAction(kycId: string, reason?: string) {
  const admin = await requireModeratorOrAbove();
  const [kyc] = await db.select().from(s.kycRequests).where(eq(s.kycRequests.id, kycId)).limit(1);
  if (!kyc) return { ok: false };
  await db.update(s.kycRequests).set({
    status: 'rejected',
    reviewedById: admin.id,
    reviewedAt: new Date(),
  }).where(eq(s.kycRequests.id, kycId));
  await db.update(s.users).set({ kycStatus: 'rejected' }).where(eq(s.users.id, kyc.userId));
  await db.insert(s.auditLog).values({
    actorId: admin.id, actorEmail: admin.email,
    action: 'KYC reddedildi', target: kyc.userId,
  });

  const [u] = await db.select({ name: s.users.name, email: s.users.email })
    .from(s.users).where(eq(s.users.id, kyc.userId)).limit(1);
  if (u) {
    await db.insert(s.notifications).values({
      userId: kyc.userId, type: 'kyc',
      title: 'KYC tekrar değerlendirmeye alındı', body: reason ?? 'Belgeleri tekrar yüklemen gerekiyor.',
      link: '/dashboard',
    });
    sendEmail({
      to: u.email,
      subject: 'KYC tekrar değerlendirilmesi gerekiyor',
      html: tplKycRejected({ name: u.name, dashboardUrl: `${APP_URL}/dashboard`, reason }),
      silent: true,
    }).catch((e) => console.warn('[kyc reject mail]', e));
  }

  return { ok: true };
}

// ----- Abuse (moderator+) -----
export async function resolveAbuseAction(reportId: string, status: 'resolved' | 'dismissed' | 'reviewing', reason?: string) {
  const admin = await requireModeratorOrAbove();
  await db.update(s.abuseReports).set({
    status,
    reviewedById: admin.id,
    reviewedAt: new Date(),
  }).where(eq(s.abuseReports.id, reportId));
  await db.insert(s.auditLog).values({
    actorId: admin.id, actorEmail: admin.email,
    action: `Şikayet ${status}`, target: reportId,
  });

  // Send email notification to the reporter when resolved or dismissed
  if (status === 'resolved' || status === 'dismissed') {
    try {
      const [report] = await db.select({ reporterId: s.abuseReports.reporterId })
        .from(s.abuseReports).where(eq(s.abuseReports.id, reportId)).limit(1);
      if (report) {
        const [reporter] = await db.select({ name: s.users.name, email: s.users.email })
          .from(s.users).where(eq(s.users.id, report.reporterId)).limit(1);
        if (reporter) {
          await sendEmail({
            to: reporter.email,
            subject: status === 'resolved'
              ? 'Şikayetiniz değerlendirildi — işlem yapıldı'
              : 'Şikayet sonucu bildirimi',
            html: tplAbuseResolved({
              name: reporter.name,
              reportId,
              status,
              reason,
            }),
            silent: true,
          });
        }
      }
    } catch (e) {
      console.warn('[abuse resolve mail]', e);
    }
  }

  return { ok: true };
}

// ----- User suspend / reactivate -----
// MH-06: suspending another admin is super_admin only.
export async function suspendUserAction(userId: string) {
  const admin = await requireAdmin();
  // Look up target role for cross-admin guard.
  const [target] = await db.select({ role: s.users.role })
    .from(s.users).where(eq(s.users.id, userId)).limit(1);
  if (!target) return { ok: false, error: 'Kullanıcı bulunamadı.' };

  if (['admin', 'moderator', 'super_admin'].includes(target.role)) {
    // Only super_admin may suspend another admin/moderator.
    if (admin.role !== 'super_admin') {
      throw new Error('Admin hesapları yalnızca süper admin tarafından askıya alınabilir.');
    }
  }

  await db.update(s.users).set({ status: 'suspended', updatedAt: new Date() }).where(eq(s.users.id, userId));
  await db.insert(s.auditLog).values({
    actorId: admin.id, actorEmail: admin.email,
    action: 'Kullanıcı askıya alındı', target: userId,
  });
  const [u] = await db.select({ name: s.users.name, email: s.users.email })
    .from(s.users).where(eq(s.users.id, userId)).limit(1);
  if (u) {
    sendEmail({
      to: u.email,
      subject: 'ISTBAKU hesabın askıya alındı',
      html: tplAccountSuspended({ name: u.name }),
      silent: true,
    }).catch((e) => console.warn('[suspend mail]', e));
  }
  return { ok: true };
}

export async function reactivateUserAction(userId: string) {
  const admin = await requireAdmin();
  const [target] = await db.select({ role: s.users.role })
    .from(s.users).where(eq(s.users.id, userId)).limit(1);
  if (!target) return { ok: false, error: 'Kullanıcı bulunamadı.' };
  if (['admin', 'moderator', 'super_admin'].includes(target.role)) {
    if (admin.role !== 'super_admin') {
      throw new Error('Admin hesapları yalnızca süper admin tarafından geri açılabilir.');
    }
  }

  await db.update(s.users).set({ status: 'active', updatedAt: new Date() }).where(eq(s.users.id, userId));
  await db.insert(s.auditLog).values({
    actorId: admin.id, actorEmail: admin.email,
    action: 'Kullanıcı tekrar aktif', target: userId,
  });
  const [u] = await db.select({ name: s.users.name, email: s.users.email })
    .from(s.users).where(eq(s.users.id, userId)).limit(1);
  if (u) {
    sendEmail({
      to: u.email,
      subject: 'ISTBAKU hesabın tekrar aktif',
      html: tplAccountReactivated({ name: u.name }),
      silent: true,
    }).catch((e) => console.warn('[reactivate mail]', e));
  }
  return { ok: true };
}

/**
 * MH-05: Reset a user's role to 'user'. Super-admin only.
 */
export async function resetUserRoleAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireSuperAdmin();
  await db.update(s.users).set({ role: 'user', updatedAt: new Date() }).where(eq(s.users.id, userId));
  await db.insert(s.auditLog).values({
    actorId: admin.id, actorEmail: admin.email,
    action: 'Kullanıcı rolü sıfırlandı', target: userId,
  });
  return { ok: true };
}

/**
 * Exposed for use by other admin actions (e.g. guide deletion).
 * Throws if the caller is not a super_admin.
 */
export async function assertSuperAdmin(): Promise<AdminCtx> {
  return requireSuperAdmin();
}
