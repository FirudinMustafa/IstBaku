'use server';

import { db } from '@/db/client';
import { kycRequests, users, notifications, auditLog, agents } from '@/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { kycSchema, type KycInput } from './schemas';
import { sanitizeText } from './sanitize';

export interface KycContext {
  isOffice: boolean;       // ofis hesabı (users.bio '[office]')
  isAgent: boolean;        // ajan rolü (ofis dahil)
  country: string | null;  // ofis ülkesi (TR/AZ...) — alan etiketleri buna göre
  office?: {
    companyName: string | null;
    taxId: string | null;
    authorizationNo: string | null;
    officeAddress: string | null;
    officeCity: string | null;
    officeDistrict: string | null;
  };
}

/** KYC formunun rol/ülkeye göre uyarlanması için bağlam (tur3 #4/#5). */
export async function getKycContext(): Promise<KycContext | null> {
  const cur = await getCurrentUser();
  if (!cur) return null;
  const [u] = await db.select({ bio: users.bio, country: users.country, role: users.role }).from(users).where(eq(users.id, cur.id)).limit(1);
  if (!u) return null;
  const isOffice = (u.bio ?? '').includes('[office]');
  const isAgent = u.role === 'agent';
  let office: KycContext['office'] | undefined;
  if (isAgent) {
    const [a] = await db.select({
      companyName: agents.companyName, taxId: agents.taxId, authorizationNo: agents.authorizationNo,
      officeAddress: agents.officeAddress, officeCity: agents.officeCity, officeDistrict: agents.officeDistrict,
    }).from(agents).where(eq(agents.userId, cur.id)).limit(1);
    office = a ?? undefined;
  }
  return { isOffice, isAgent, country: u.country ?? null, office };
}

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

  // Ofis/şirket KYC alanları (tur3 #4/#5)
  const isOfficeKyc = !!parsed.data.isOfficeKyc;
  const office = isOfficeKyc ? {
    companyName: parsed.data.companyName ? sanitizeText(parsed.data.companyName, { maxLength: 160 }) : null,
    taxId: parsed.data.taxId ? sanitizeText(parsed.data.taxId, { maxLength: 64 }) : null,
    authorizationNo: parsed.data.authorizationNo ? sanitizeText(parsed.data.authorizationNo, { maxLength: 64 }) : null,
    officeAddress: parsed.data.officeAddress ? sanitizeText(parsed.data.officeAddress, { maxLength: 300 }) : null,
    officeCity: parsed.data.officeCity ? sanitizeText(parsed.data.officeCity, { maxLength: 80 }) : null,
    officeDistrict: parsed.data.officeDistrict ? sanitizeText(parsed.data.officeDistrict, { maxLength: 80 }) : null,
  } : null;
  // Ofis ise tür her zaman 'agent_license'; admin notuna tüm alanlar yazılır.
  const effectiveType: KycType = isOfficeKyc ? 'agent_license' : type;
  const notes = isOfficeKyc && office
    ? `OFİS · Yetkili: ${fullName} · Kimlik(TC/FIN): ${idNumber} · Şirket: ${office.companyName ?? '-'} · Vergi/VÖEN: ${office.taxId ?? '-'} · Yetki no: ${office.authorizationNo ?? '-'} · Adres: ${office.officeAddress ?? '-'}, ${office.officeCity ?? '-'}/${office.officeDistrict ?? '-'}`
    : `Ad: ${fullName} · Kimlik: ${idNumber}`;

  await db.transaction(async (tx) => {
    await tx.insert(kycRequests).values({
      userId: user.id,
      type: effectiveType,
      documents,
      status: 'pending',
      aiCheckNotes: notes,
    });
    // Ofis alanlarını agents tablosuna işle (varsa).
    if (isOfficeKyc && office) {
      const [au] = await tx.select({ country: users.country }).from(users).where(eq(users.id, user.id)).limit(1);
      await tx.update(agents).set({
        companyName: office.companyName,
        taxId: office.taxId,
        authorizationNo: office.authorizationNo,
        officeAddress: office.officeAddress,
        officeCity: office.officeCity,
        officeDistrict: office.officeDistrict,
        officeCountry: au?.country ?? undefined,
        officeDocs: documents,
      }).where(eq(agents.userId, user.id));
    }
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
