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
/**
 * İlan onay kuyruğundaki TEK bir talebi onaylar (talebe-özel — Madde 4 fix).
 * - `new_listing` / `price_change` / `photo_update` → YAYIN onayı: yalnızca
 *   approvalStatus='approved' yapılır. İstBaku rozetine (istbakuApproved) DOKUNULMAZ.
 * - `tier_upgrade` → ROZET onayı: yalnızca ödemesi 'paid' olan rozet talebi için
 *   istbakuApproved=true + approvalLevel set edilir. Ödeme yoksa onay reddedilir.
 * Böylece "normal onay verince rozet de bedava veriliyor" ve "tek tıkla ikisi birden
 * onaylanıyor" bug'ları ortadan kalkar.
 */
export async function approveListingAction(requestId: string, level: 1 | 2 | 3 = 2) {
  const admin = await requireModeratorOrAbove();
  if (![1, 2, 3].includes(level)) {
    return { ok: false, error: 'Geçersiz seviye.' };
  }

  const [reqRow] = await db.select().from(s.approvalRequests)
    .where(eq(s.approvalRequests.id, requestId)).limit(1);
  if (!reqRow) return { ok: false, error: 'Onay talebi bulunamadı.' };
  if (reqRow.status !== 'pending') return { ok: false, error: 'Bu talep zaten işlenmiş.' };
  const listingId = reqRow.listingId;
  const isBadge = reqRow.type === 'tier_upgrade';

  if (isBadge) {
    // Rozet onayı yalnızca ödemesi alınmış talepler için verilebilir.
    const [paid] = await db.select({ id: s.payments.id }).from(s.payments)
      .where(and(
        eq(s.payments.listingId, listingId),
        eq(s.payments.type, 'istbaku_approved'),
        eq(s.payments.status, 'paid'),
      )).orderBy(desc(s.payments.createdAt)).limit(1);
    if (!paid) return { ok: false, error: 'Bu rozet için onaylanmış ödeme bulunamadı.' };
    await db.update(s.listings).set({
      istbakuApproved: true,
      approvalLevel: level,
      aiVerified: true,
      tier: 'premium',
      updatedAt: new Date(),
    }).where(eq(s.listings.id, listingId));
  } else {
    // Yayın onayı — rozete dokunma. Madde 20: onaylanan ilanın fotoğraflarına
    // kalıcı (dosyaya gömülü) watermark uygula. Idempotent: `watermarked` flag'i.
    const [lst] = await db.select({
      images: s.listings.images,
      coverSrc: s.listings.coverSrc,
      coverKind: s.listings.coverKind,
      watermarked: s.listings.watermarked,
    }).from(s.listings).where(eq(s.listings.id, listingId)).limit(1);

    let stamped: { images: string[]; coverSrc: string | null } | null = null;
    if (lst && !lst.watermarked && Array.isArray(lst.images) && lst.images.length > 0) {
      try {
        const { watermarkListingImages } = await import('./watermark');
        const newImages = await watermarkListingImages(lst.images);
        // Kapak fotoğrafı images içindeyse yeni (damgalı) URL'sine yönlendir.
        let newCover = lst.coverSrc;
        if (lst.coverKind === 'photo' && lst.coverSrc) {
          const ci = lst.images.indexOf(lst.coverSrc);
          if (ci >= 0) newCover = newImages[ci];
        }
        stamped = { images: newImages, coverSrc: newCover };
      } catch (e) {
        console.warn('[approve watermark]', e);
      }
    }

    await db.update(s.listings).set({
      approvalStatus: 'approved',
      ...(stamped ? { images: stamped.images, coverSrc: stamped.coverSrc, watermarked: true } : {}),
      updatedAt: new Date(),
    }).where(eq(s.listings.id, listingId));
  }

  // SADECE bu talebi onayla.
  await db.update(s.approvalRequests).set({
    status: 'approved',
    reviewedById: admin.id,
    reviewedAt: new Date(),
  }).where(eq(s.approvalRequests.id, requestId));

  await db.insert(s.auditLog).values({
    actorId: admin.id, actorEmail: admin.email,
    action: isBadge ? 'İstBaku rozeti onaylandı' : 'İlan yayını onaylandı', target: listingId,
    meta: { level, requestType: reqRow.type },
  });

  // Ajana mail/bildirim
  const [listing] = await db.select({ title: s.listings.title, slug: s.listings.slug, agentId: s.listings.agentId })
    .from(s.listings).where(eq(s.listings.id, listingId)).limit(1);
  if (listing?.agentId) {
    const [agent] = await db.select({ name: s.users.name, email: s.users.email })
      .from(s.users).where(eq(s.users.id, listing.agentId)).limit(1);
    if (agent) {
      await db.insert(s.notifications).values({
        userId: listing.agentId,
        type: 'approval',
        title: isBadge ? `İstBaku Onaylı rozetin verildi: ${listing.title}` : `İlanın onaylandı: ${listing.title}`,
        body: isBadge ? `İlanın artık İstBaku Onaylı (Seviye ${level}) rozetiyle öne çıkıyor.` : 'İlanın yayında ve aramada görünür.',
        link: `/property/${listing.slug}`,
      });
      sendEmail({
        to: agent.email,
        subject: isBadge ? `İstBaku Onaylı rozetin verildi — ${listing.title}` : `İlanın yayında! — ${listing.title}`,
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

/**
 * Tek bir onay talebini reddeder (talebe-özel — Madde 4 fix).
 * - `tier_upgrade` reddi → ilan YAYINDA kalır; sadece rozet/premium geri alınır,
 *   kullanıcıya iade bildirimi gider.
 * - Yayın talebi reddi → ilan approvalStatus='rejected' (yayından düşer).
 */
export async function rejectListingAction(requestId: string, reason?: string) {
  const admin = await requireModeratorOrAbove();

  const [reqRow] = await db.select().from(s.approvalRequests)
    .where(eq(s.approvalRequests.id, requestId)).limit(1);
  if (!reqRow) return { ok: false, error: 'Onay talebi bulunamadı.' };
  if (reqRow.status !== 'pending') return { ok: false, error: 'Bu talep zaten işlenmiş.' };
  const listingId = reqRow.listingId;
  const isBadge = reqRow.type === 'tier_upgrade';

  await db.update(s.approvalRequests).set({
    status: 'rejected',
    reviewedById: admin.id,
    reviewedAt: new Date(),
    notes: reason,
  }).where(eq(s.approvalRequests.id, requestId));

  if (isBadge) {
    // Rozet reddi: yayın etkilenmez, premium/rozet geri alınır.
    await db.update(s.listings).set({
      istbakuApproved: false,
      tier: 'standart',
      updatedAt: new Date(),
    }).where(eq(s.listings.id, listingId));
  } else {
    await db.update(s.listings).set({ approvalStatus: 'rejected', updatedAt: new Date() }).where(eq(s.listings.id, listingId));
  }

  await db.insert(s.auditLog).values({
    actorId: admin.id, actorEmail: admin.email,
    action: isBadge ? 'İstBaku rozeti reddedildi' : 'İlan reddedildi', target: listingId,
    meta: { reason, requestType: reqRow.type },
  });

  const [listing] = await db.select({ title: s.listings.title, slug: s.listings.slug, agentId: s.listings.agentId })
    .from(s.listings).where(eq(s.listings.id, listingId)).limit(1);
  if (listing?.agentId) {
    const [agent] = await db.select({ name: s.users.name, email: s.users.email })
      .from(s.users).where(eq(s.users.id, listing.agentId)).limit(1);
    if (agent) {
      if (isBadge) {
        await db.insert(s.notifications).values({
          userId: listing.agentId,
          type: 'approval',
          title: `İstBaku Onaylı başvurun reddedildi: ${listing.title}`,
          body: `${reason ?? 'Rozet kriterleri sağlanmadı.'} İlanın yayında kalmaya devam ediyor; rozet ücreti iade edilecektir.`,
          link: `/property/${listing.slug}`,
        });
      } else {
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
