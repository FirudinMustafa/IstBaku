'use server';

import { db } from '@/db/client';
import { kycRequests, users, notifications, auditLog } from '@/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { kycSchema, type KycInput } from './schemas';
import { sanitizeText } from './sanitize';

const KYC_TYPES = ['investor', 'agent_license', 'title_deed'] as const;
export type KycType = (typeof KYC_TYPES)[number];

export interface MyKycState {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  lastType?: string;
  reviewNotes?: string | null;
  submittedAt?: string;
}

/** Kullanıcının mevcut KYC durumu + son başvuru bilgisi. */
export async function getMyKycState(): Promise<MyKycState | null> {
  const cur = await getCurrentUser();
  if (!cur) return null;

  const [u] = await db.select({ kycStatus: users.kycStatus }).from(users).where(eq(users.id, cur.id)).limit(1);
  if (!u) return null;

  const [last] = await db
    .select()
    .from(kycRequests)
    .where(eq(kycRequests.userId, cur.id))
    .orderBy(desc(kycRequests.createdAt))
    .limit(1);

  return {
    status: u.kycStatus,
    lastType: last?.type,
    reviewNotes: last?.aiCheckNotes ?? null,
    submittedAt: last?.createdAt?.toISOString(),
  };
}

/** Kullanıcıya dönük KYC başvurusu (PF-05). E-posta-only doğrulama politikasıyla uyumlu — SMS yok. */
export async function submitKycAction(
  input: KycInput & { type?: KycType },
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Başvuru için giriş yapmalısın.' };

  const parsed = kycSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Form geçersiz.' };
  }

  const type: KycType = KYC_TYPES.includes(input.type as KycType) ? (input.type as KycType) : 'investor';

  // Zaten onaylı veya beklemede bir başvuru varsa tekrar gönderme.
  const existing = await db
    .select({ id: kycRequests.id, status: kycRequests.status })
    .from(kycRequests)
    .where(and(eq(kycRequests.userId, user.id), inArray(kycRequests.status, ['pending', 'approved'])))
    .limit(1);
  if (existing.length > 0) {
    const isApproved = existing[0].status === 'approved';
    return {
      ok: false,
      error: isApproved ? 'KYC zaten onaylı.' : 'Bekleyen bir KYC başvurun var. Sonucu bekle.',
    };
  }

  const fullName = sanitizeText(parsed.data.fullName, { maxLength: 120 });
  const idNumber = sanitizeText(parsed.data.idNumber, { maxLength: 32 });
  const documents = parsed.data.documents.map((d) => ({
    name: sanitizeText(d.name, { maxLength: 200 }),
    url: d.url,
  }));

  await db.transaction(async (tx) => {
    await tx.insert(kycRequests).values({
      userId: user.id,
      type,
      documents,
      status: 'pending',
      aiCheckNotes: `Ad: ${fullName} · Kimlik: ${idNumber}`,
    });
    await tx.update(users).set({ kycStatus: 'pending' }).where(eq(users.id, user.id));
    await tx.insert(notifications).values({
      userId: user.id,
      type: 'kyc',
      title: 'KYC başvurun alındı',
      body: 'Belgelerin incelemeye alındı. Sonucu e-posta ile bildireceğiz.',
    });
    await tx.insert(auditLog).values({
      actorId: user.id,
      action: 'KYC başvurusu gönderildi',
      target: user.id,
    });
  });

  return { ok: true };
}
