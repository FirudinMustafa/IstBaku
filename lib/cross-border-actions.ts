'use server';

import { db } from '@/db/client';
import { crossBorderSteps } from '@/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';
import { getCurrentAdmin } from './auth-actions';
import { sanitizeText } from './sanitize';

// ------------------------------------------------------------------
// Sınır ötesi alım adımları — admin tarafından düzenlenebilir.
// Tablo boşken kamu sayfası hardcoded fallback'e düşer (graceful).
// ------------------------------------------------------------------

export type Nationality = 'TR' | 'AZ' | 'OTHER';
export type Country = 'TR' | 'AZ';
export type Purpose = 'oturum' | 'yatirim' | 'isyeri';
export type StepLang = 'tr' | 'az' | 'en' | 'ru' | 'de' | 'zh';

const NATIONALITIES: Nationality[] = ['TR', 'AZ', 'OTHER'];
const COUNTRIES: Country[] = ['TR', 'AZ'];
const PURPOSES: Purpose[] = ['oturum', 'yatirim', 'isyeri'];
const LANGS: StepLang[] = ['tr', 'az', 'en', 'ru', 'de', 'zh'];

export interface CrossBorderStepDTO {
  id: string;
  nationality: string;
  country: string;
  purpose: string;
  language: StepLang;
  orderIndex: number;
  icon: string | null;
  title: string;
  description: string;
  active: boolean;
}

export interface StepFilter {
  nationality: Nationality;
  country: Country;
  purpose: Purpose;
  language: StepLang;
}

export interface StepInput {
  nationality: Nationality;
  country: Country;
  purpose: Purpose;
  language: StepLang;
  icon: string;
  title: string;
  description: string;
}

function validFilter(f: Partial<StepFilter>): StepFilter | null {
  if (!f.nationality || !NATIONALITIES.includes(f.nationality)) return null;
  if (!f.country || !COUNTRIES.includes(f.country)) return null;
  if (!f.purpose || !PURPOSES.includes(f.purpose)) return null;
  if (!f.language || !LANGS.includes(f.language)) return null;
  return { nationality: f.nationality, country: f.country, purpose: f.purpose, language: f.language };
}

/**
 * Public query — used by the legal-guide page. Tolerates an empty table
 * (returns []) so the caller can fall back to hardcoded steps.
 */
export async function getCrossBorderSteps(filter: Partial<StepFilter>): Promise<CrossBorderStepDTO[]> {
  const f = validFilter(filter);
  if (!f) return [];
  try {
    const rows = await db
      .select()
      .from(crossBorderSteps)
      .where(
        and(
          eq(crossBorderSteps.nationality, f.nationality),
          eq(crossBorderSteps.country, f.country),
          eq(crossBorderSteps.purpose, f.purpose),
          eq(crossBorderSteps.language, f.language),
          eq(crossBorderSteps.active, true),
        ),
      )
      .orderBy(asc(crossBorderSteps.orderIndex));
    return rows.map(toDTO);
  } catch (err) {
    // Tablo henüz yoksa / boşsa sessizce boş dön → hardcoded fallback devreye girer.
    console.error('getCrossBorderSteps', err);
    return [];
  }
}

function toDTO(r: typeof crossBorderSteps.$inferSelect): CrossBorderStepDTO {
  return {
    id: r.id,
    nationality: r.nationality,
    country: r.country,
    purpose: r.purpose,
    language: r.language as StepLang,
    orderIndex: r.orderIndex,
    icon: r.icon,
    title: r.title,
    description: r.description,
    active: r.active,
  };
}

/** Admin: belirli kombinasyonun tüm adımlarını (aktif/pasif) sıralı getir. */
export async function listCrossBorderStepsAction(
  filter: Partial<StepFilter>,
): Promise<{ ok: boolean; steps?: CrossBorderStepDTO[]; error?: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: 'Admin yetkisi gerekli.' };
  const f = validFilter(filter);
  if (!f) return { ok: false, error: 'Geçersiz filtre.' };
  try {
    const rows = await db
      .select()
      .from(crossBorderSteps)
      .where(
        and(
          eq(crossBorderSteps.nationality, f.nationality),
          eq(crossBorderSteps.country, f.country),
          eq(crossBorderSteps.purpose, f.purpose),
          eq(crossBorderSteps.language, f.language),
        ),
      )
      .orderBy(asc(crossBorderSteps.orderIndex));
    return { ok: true, steps: rows.map(toDTO) };
  } catch (err) {
    console.error('listCrossBorderStepsAction', err);
    return { ok: false, error: 'Sunucu hatası (tablo eksik olabilir).' };
  }
}

function sanitizeInput(input: StepInput): { ok: true; safe: StepInput } | { ok: false; error: string } {
  const f = validFilter(input);
  if (!f) return { ok: false, error: 'Geçersiz kombinasyon (vatandaşlık/ülke/amaç/dil).' };
  const title = sanitizeText(input.title, { maxLength: 200 });
  if (!title) return { ok: false, error: 'Başlık gerekli.' };
  const description = sanitizeText(input.description, { maxLength: 2_000 });
  if (!description) return { ok: false, error: 'Açıklama gerekli.' };
  // Lucide ikon adı: yalnız harf/rakam, 48 char sınırı.
  const icon = sanitizeText(input.icon, { maxLength: 48 }).replace(/[^A-Za-z0-9]/g, '');
  return { ok: true, safe: { ...f, icon: icon || 'FileCheck2', title, description } };
}

/** Admin: yeni adım ekle (orderIndex otomatik = mevcut max + 1). */
export async function createCrossBorderStepAction(
  input: StepInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: 'Admin yetkisi gerekli.' };
  const res = sanitizeInput(input);
  if (!res.ok) return res;
  const { safe } = res;
  try {
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${crossBorderSteps.orderIndex}), -1)` })
      .from(crossBorderSteps)
      .where(
        and(
          eq(crossBorderSteps.nationality, safe.nationality),
          eq(crossBorderSteps.country, safe.country),
          eq(crossBorderSteps.purpose, safe.purpose),
          eq(crossBorderSteps.language, safe.language),
        ),
      );
    const [row] = await db
      .insert(crossBorderSteps)
      .values({
        nationality: safe.nationality,
        country: safe.country,
        purpose: safe.purpose,
        language: safe.language,
        icon: safe.icon,
        title: safe.title,
        description: safe.description,
        orderIndex: Number(max) + 1,
        updatedAt: new Date(),
      })
      .returning({ id: crossBorderSteps.id });
    return { ok: true, id: row.id };
  } catch (err) {
    console.error('createCrossBorderStepAction', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

/** Admin: mevcut adımı güncelle (başlık/açıklama/ikon/aktiflik). */
export async function updateCrossBorderStepAction(
  id: string,
  input: { icon: string; title: string; description: string; active?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: 'Admin yetkisi gerekli.' };
  const title = sanitizeText(input.title, { maxLength: 200 });
  if (!title) return { ok: false, error: 'Başlık gerekli.' };
  const description = sanitizeText(input.description, { maxLength: 2_000 });
  if (!description) return { ok: false, error: 'Açıklama gerekli.' };
  const icon = sanitizeText(input.icon, { maxLength: 48 }).replace(/[^A-Za-z0-9]/g, '') || 'FileCheck2';
  try {
    await db
      .update(crossBorderSteps)
      .set({
        icon,
        title,
        description,
        ...(typeof input.active === 'boolean' ? { active: input.active } : {}),
        updatedAt: new Date(),
      })
      .where(eq(crossBorderSteps.id, id));
    return { ok: true };
  } catch (err) {
    console.error('updateCrossBorderStepAction', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

/** Admin: adımı sil. */
export async function deleteCrossBorderStepAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: 'Admin yetkisi gerekli.' };
  try {
    await db.delete(crossBorderSteps).where(eq(crossBorderSteps.id, id));
    return { ok: true };
  } catch (err) {
    console.error('deleteCrossBorderStepAction', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

/**
 * Admin: adımın sırasını bir yukarı/aşağı taşı — komşu satırla orderIndex
 * değerlerini takas eder (aynı kombinasyon içinde).
 */
export async function reorderCrossBorderStepAction(
  id: string,
  direction: 'up' | 'down',
): Promise<{ ok: boolean; error?: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: 'Admin yetkisi gerekli.' };
  try {
    const [current] = await db.select().from(crossBorderSteps).where(eq(crossBorderSteps.id, id)).limit(1);
    if (!current) return { ok: false, error: 'Adım bulunamadı.' };

    const siblings = await db
      .select()
      .from(crossBorderSteps)
      .where(
        and(
          eq(crossBorderSteps.nationality, current.nationality),
          eq(crossBorderSteps.country, current.country),
          eq(crossBorderSteps.purpose, current.purpose),
          eq(crossBorderSteps.language, current.language),
        ),
      )
      .orderBy(asc(crossBorderSteps.orderIndex));

    const idx = siblings.findIndex((s) => s.id === id);
    const swapWith = direction === 'up' ? siblings[idx - 1] : siblings[idx + 1];
    if (!swapWith) return { ok: true }; // zaten uçta

    await db
      .update(crossBorderSteps)
      .set({ orderIndex: swapWith.orderIndex, updatedAt: new Date() })
      .where(eq(crossBorderSteps.id, current.id));
    await db
      .update(crossBorderSteps)
      .set({ orderIndex: current.orderIndex, updatedAt: new Date() })
      .where(eq(crossBorderSteps.id, swapWith.id));
    return { ok: true };
  } catch (err) {
    console.error('reorderCrossBorderStepAction', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

// ------------------------------------------------------------------
// SEED — lib/data/country-guides.ts içindeki hardcoded adımları
// (legal-guide sayfasındaki STEPS) içe aktarır. İdempotent: tabloda
// satır varsa hiçbir şey yapmaz.
// ------------------------------------------------------------------

// Hardcoded STEPS map'inin sunucu tarafı kopyası. lucide ikon BİLEŞENLERİ
// yerine STRING adları tutulur (DB icon kolonuna doğrudan yazılabilsin diye).
const SEED_STEPS: Partial<
  Record<StepLang, Record<string, { title: string; desc: string; icon: string }[]>>
> = {
  tr: {
    'TR-TR': [
      { title: 'Vergi numarası al', desc: 'TR vatandaşı için TC kimlik = vergi no, ek işlem yok.', icon: 'FileCheck2' },
      { title: 'Tapuda alım sözleşmesi', desc: 'Noter şartı yok, ancak hukuki danışman önerilir.', icon: 'Scale' },
      { title: 'Tapu harcı + DASK', desc: '%4 tapu harcı (alıcı+satıcı paylaşımı pazarlık).', icon: 'Coins' },
      { title: 'Aboneliklerin devri', desc: 'Su, elektrik, doğalgaz devir işlemleri.', icon: 'CheckCircle2' },
    ],
    'TR-AZ': [
      { title: 'AZ Vergi numarası (VOEN) al', desc: 'Pasaport ile vergi dairesinden 30 dk.', icon: 'FileCheck2' },
      { title: 'AZ banka hesabı aç', desc: 'Yabancı için Kapital Bank, ABB, PASHA önerilir.', icon: 'Coins' },
      { title: 'Notarial alım-satım sözleşmesi', desc: 'Azerbaycan\'da emlak alımı notar şartı vardır.', icon: 'Scale' },
      { title: 'ASAN Xidmət\'te tapu tescili', desc: '%0.1 dövlət rüsumu + 30 manat hizmet bedeli.', icon: 'FileCheck2' },
      { title: 'MIDA üzerinden yabancı bildirimi', desc: 'Türk vatandaşı kolaylığı: özel rejim.', icon: 'Globe2' },
      { title: 'Oturum izni (opsiyonel)', desc: '$100K+ alımda 1 yıllık oturum izni başvurusu.', icon: 'BookOpen' },
    ],
    'AZ-TR': [
      { title: 'Türkiye Vergi Kimlik Numarası', desc: 'Pasaport ile en yakın vergi dairesinden.', icon: 'FileCheck2' },
      { title: 'TR banka hesabı + DASK', desc: 'Zorunlu deprem sigortası.', icon: 'Coins' },
      { title: 'Tapu Müdürlüğü randevusu', desc: 'WebTapu veya 181 üzerinden randevu.', icon: 'Scale' },
      { title: '$400K+ alımda vatandaşlık seçeneği', desc: 'Türk vatandaşlık programı (CBI).', icon: 'Globe2' },
      { title: 'Tapu harcı ve döner sermaye', desc: '%4 tapu harcı + döner sermaye ücreti.', icon: 'Coins' },
    ],
    'AZ-AZ': [
      { title: 'VOEN doğrulama', desc: 'AZ vatandaşı için kimlik kafidir.', icon: 'FileCheck2' },
      { title: 'Notar sözleşmesi', desc: 'Mecburi notarial onay.', icon: 'Scale' },
      { title: 'ASAN Xidmət tescili', desc: 'Devlet rüsumu ödenir, e-imza ile hızlandırılır.', icon: 'FileCheck2' },
    ],
    'OTHER-TR': [
      { title: 'Vergi kimlik numarası al', desc: 'Pasaport + adres beyanı ile vergi dairesinden vergi numarası alınır. Yabancı alıcı için zorunludur.', icon: 'FileCheck2' },
      { title: 'Askeri/güvenlik bölgesi kontrolü', desc: 'Tapu Müdürlüğü, bölgenin yabancı alımına açık olup olmadığını teyit eder. Çoğu il sorunsuzdur.', icon: 'Globe2' },
      { title: 'Ekspertiz raporu (zorunlu)', desc: 'Lisanslı eksper, taşınmazın gerçek piyasa değerini raporlar — son 3 ayda geçerlidir.', icon: 'BookOpen' },
      { title: 'TR banka hesabı + DASK', desc: 'Yabancılar için TR bankalarında hesap açılışı + zorunlu deprem sigortası.', icon: 'Coins' },
      { title: 'Tapu Müdürlüğü randevusu', desc: 'WebTapu üzerinden randevu, devir sırasında yeminli tercüman bulunur.', icon: 'Scale' },
      { title: 'Vatandaşlık seçeneği', desc: '$400K+ alım + 3 yıl satmama taahhüdü Türk vatandaşlığı doğurur.', icon: 'Globe2' },
    ],
    'OTHER-AZ': [
      { title: 'VOEN al', desc: 'Pasaport ile vergi dairesinden VOEN alınır.', icon: 'FileCheck2' },
      { title: 'Notarial sözleşme', desc: 'AZ\'de emlak alımı zorunlu noter onayı gerektirir.', icon: 'Scale' },
      { title: 'AZ banka hesabı', desc: 'Ödeme banka transferiyle yapılır.', icon: 'Coins' },
      { title: 'ASAN Xidmət tapu tescili', desc: '%0.1 devlet rüsumu + hizmet bedeli.', icon: 'FileCheck2' },
      { title: 'Oturum izni (opsiyonel)', desc: '$100K+ alımda 1 yıllık oturum başvurusu yapılabilir.', icon: 'BookOpen' },
    ],
  },
  az: {
    'TR-TR': [
      { title: 'Vergi nömrəsi al', desc: 'TC kimliyi vergi nömrəsi yerinə keçir.', icon: 'FileCheck2' },
      { title: 'Alış-veriş müqaviləsi', desc: 'Notarius məcburi deyil, lakin tövsiyə olunur.', icon: 'Scale' },
      { title: 'Tapu rüsumu + DASK', desc: '4% tapu rüsumu, alıcı/satıcı arasında bölünə bilər.', icon: 'Coins' },
      { title: 'Komunal abunəliklərin köçürülməsi', desc: 'Su, elektrik, qaz.', icon: 'CheckCircle2' },
    ],
    'TR-AZ': [
      { title: 'VOEN al (vergi nömrəsi)', desc: 'Pasportla vergi idarəsindən 30 dəq.', icon: 'FileCheck2' },
      { title: 'AZ bank hesabı', desc: 'Xaricilər üçün Kapital Bank, ABB, PASHA.', icon: 'Coins' },
      { title: 'Notarial alış-veriş müqaviləsi', desc: 'Azərbaycanda notarial təsdiq vacibdir.', icon: 'Scale' },
      { title: 'ASAN Xidmətdə tapu', desc: '0.1% dövlət rüsumu + 30 AZN xidmət.', icon: 'FileCheck2' },
      { title: 'MIDA xarici bildirişi', desc: 'Türk vətəndaşları üçün xüsusi rejim.', icon: 'Globe2' },
      { title: 'Yaşayış icazəsi (istəyə bağlı)', desc: '$100K+ alış üçün 1 illik yaşayış icazəsi.', icon: 'BookOpen' },
    ],
    'AZ-TR': [
      { title: 'Türkiyə vergi nömrəsi', desc: 'Pasportla yaxın vergi idarəsindən.', icon: 'FileCheck2' },
      { title: 'TR bank hesabı + DASK', desc: 'Məcburi zəlzələ sığortası.', icon: 'Coins' },
      { title: 'Tapu randevusu', desc: 'WebTapu vəya 181 üzərindən.', icon: 'Scale' },
      { title: '$400K+ alış → Türk vətəndaşlığı', desc: 'CBI proqramı vasitəsilə.', icon: 'Globe2' },
      { title: 'Tapu rüsumu', desc: '4% + əlavə xidmət haqqı.', icon: 'Coins' },
    ],
    'AZ-AZ': [
      { title: 'VOEN təsdiqi', desc: 'Şəxsiyyət vəsiqəsi kifayət edir.', icon: 'FileCheck2' },
      { title: 'Notarial müqavilə', desc: 'Mütləq notarial təsdiq.', icon: 'Scale' },
      { title: 'ASAN Xidmət', desc: 'Dövlət rüsumu, e-imza ilə sürətli.', icon: 'FileCheck2' },
    ],
    'OTHER-TR': [
      { title: 'Vergi nömrəsi al', desc: 'Pasport və ünvan bildirişi ilə vergi idarəsindən. Xarici alıcı üçün məcburidir.', icon: 'FileCheck2' },
      { title: 'Hərbi bölgə yoxlaması', desc: 'Tapu Müdürlüyü bölgənin xaricilərə açıq olub-olmadığını yoxlayır.', icon: 'Globe2' },
      { title: 'Ekspertiza hesabatı (məcburi)', desc: 'Lisenziyalı ekspert əmlakın bazar dəyərini təsdiqləyir — 3 ay etibarlıdır.', icon: 'BookOpen' },
      { title: 'TR bank hesabı + DASK', desc: 'Bank hesabı + məcburi zəlzələ sığortası.', icon: 'Coins' },
      { title: 'Tapu randevusu', desc: 'WebTapu üzərindən randevu, andlı tərcüməçi tələb olunur.', icon: 'Scale' },
      { title: 'Vətəndaşlıq seçimi', desc: '$400K+ alış + 3 il satmamaq öhdəliyi vətəndaşlıq verir.', icon: 'Globe2' },
    ],
    'OTHER-AZ': [
      { title: 'VOEN al', desc: 'Pasportla vergi idarəsindən.', icon: 'FileCheck2' },
      { title: 'Notarial müqavilə', desc: 'Azərbaycanda notarial təsdiq vacibdir.', icon: 'Scale' },
      { title: 'AZ bank hesabı', desc: 'Ödəmə bank köçürməsi ilə.', icon: 'Coins' },
      { title: 'ASAN Xidmət', desc: '0.1% dövlət rüsumu + xidmət haqqı.', icon: 'FileCheck2' },
      { title: 'Yaşayış icazəsi (istəyə bağlı)', desc: '$100K+ alış üçün 1 illik yaşayış icazəsi.', icon: 'BookOpen' },
    ],
  },
  en: {
    'TR-TR': [
      { title: 'Get a tax number', desc: 'For Turkish citizens the national ID doubles as the tax number — no extra step.', icon: 'FileCheck2' },
      { title: 'Title deed contract', desc: 'A notary is not mandatory, but a legal advisor is recommended.', icon: 'Scale' },
      { title: 'Title deed fee + DASK', desc: '4% transfer fee (buyer/seller split is negotiable) plus mandatory earthquake insurance.', icon: 'Coins' },
      { title: 'Utility transfers', desc: 'Water, electricity, gas — moved to the buyer.', icon: 'CheckCircle2' },
    ],
    'TR-AZ': [
      { title: 'Get an AZ tax number (VOEN)', desc: 'About 30 minutes at the tax office with a passport.', icon: 'FileCheck2' },
      { title: 'Open an AZ bank account', desc: 'Kapital Bank, ABB, PASHA are friendly to foreigners.', icon: 'Coins' },
      { title: 'Notarised purchase contract', desc: 'AZ requires a notary for property transactions.', icon: 'Scale' },
      { title: 'Title deed at ASAN Xidmət', desc: '0.1% state fee + 30 AZN service charge.', icon: 'FileCheck2' },
      { title: 'MIDA foreign-buyer notice', desc: 'Special regime simplifies the process for Turkish citizens.', icon: 'Globe2' },
      { title: 'Residency permit (optional)', desc: '$100K+ purchase qualifies for a 1-year residency permit.', icon: 'BookOpen' },
    ],
    'AZ-TR': [
      { title: 'Turkish Tax ID', desc: 'Apply with your passport at the nearest tax office.', icon: 'FileCheck2' },
      { title: 'TR bank account + DASK', desc: 'Mandatory earthquake insurance.', icon: 'Coins' },
      { title: 'Title deed appointment', desc: 'Book via WebTapu or 181.', icon: 'Scale' },
      { title: '$400K+ purchase = citizenship route', desc: 'Turkish Citizenship by Investment (CBI).', icon: 'Globe2' },
      { title: 'Title fee', desc: '4% transfer fee + service charge.', icon: 'Coins' },
    ],
    'AZ-AZ': [
      { title: 'VOEN verification', desc: 'National ID is sufficient.', icon: 'FileCheck2' },
      { title: 'Notary contract', desc: 'Mandatory notarial approval.', icon: 'Scale' },
      { title: 'Title at ASAN Xidmət', desc: 'State fee; e-signature speeds it up.', icon: 'FileCheck2' },
    ],
    'OTHER-TR': [
      { title: 'Foreign buyer in Turkey — Tax ID', desc: 'Foreign buyer must obtain a Turkish tax ID at the tax office (passport + address declaration).', icon: 'FileCheck2' },
      { title: 'Restricted-zone check', desc: 'The Land Registry confirms the property is not in a military/security zone closed to foreigners. Most provinces are open.', icon: 'Globe2' },
      { title: 'Valuation report (mandatory)', desc: 'A licensed appraiser issues an SPK-approved valuation valid for 3 months.', icon: 'BookOpen' },
      { title: 'TR bank account + DASK', desc: 'Open a Turkish bank account and buy the mandatory earthquake insurance.', icon: 'Coins' },
      { title: 'Title deed appointment', desc: 'Book via WebTapu; a sworn translator must attend the signing.', icon: 'Scale' },
      { title: 'Citizenship route', desc: 'A $400K+ purchase with a 3-year no-sale commitment unlocks Turkish citizenship.', icon: 'Globe2' },
    ],
    'OTHER-AZ': [
      { title: 'Get a VOEN', desc: 'Tax number at the local tax office with your passport.', icon: 'FileCheck2' },
      { title: 'Notarised contract', desc: 'AZ requires a notary for property transactions.', icon: 'Scale' },
      { title: 'AZ bank account', desc: 'Payments must clear via a bank transfer.', icon: 'Coins' },
      { title: 'ASAN Xidmət registration', desc: '0.1% state fee + service charge.', icon: 'FileCheck2' },
      { title: 'Residency permit (optional)', desc: '$100K+ purchase qualifies for a 1-year residency permit.', icon: 'BookOpen' },
    ],
  },
};

/**
 * İdempotent seed. Tabloda en az bir satır varsa hiçbir şey yapmaz.
 * Aksi halde hardcoded STEPS map'ini DB'ye yazar. purpose için tüm hardcoded
 * varyantlar 'yatirim' altında saklanır (kamu sayfası purpose'u bu adımlarda
 * ayırt etmiyordu).
 */
export async function seedCrossBorderStepsAction(): Promise<{
  ok: boolean;
  inserted?: number;
  skipped?: boolean;
  error?: string;
}> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: 'Admin yetkisi gerekli.' };

  try {
    const existing = await db.select({ id: crossBorderSteps.id }).from(crossBorderSteps).limit(1);
    if (existing.length > 0) return { ok: true, skipped: true, inserted: 0 };

    const rows: typeof crossBorderSteps.$inferInsert[] = [];
    for (const lang of Object.keys(SEED_STEPS) as StepLang[]) {
      const byKey = SEED_STEPS[lang]!;
      for (const key of Object.keys(byKey)) {
        const [nationality, country] = key.split('-') as [Nationality, Country];
        byKey[key].forEach((step, idx) => {
          rows.push({
            nationality,
            country,
            purpose: 'yatirim',
            language: lang,
            orderIndex: idx,
            icon: step.icon,
            title: step.title,
            description: step.desc,
            active: true,
            updatedAt: new Date(),
          });
        });
      }
    }
    if (rows.length === 0) return { ok: true, inserted: 0 };
    await db.insert(crossBorderSteps).values(rows);
    return { ok: true, inserted: rows.length };
  } catch (err) {
    console.error('seedCrossBorderStepsAction', err);
    return { ok: false, error: 'Sunucu hatası (tablo eksik olabilir).' };
  }
}
