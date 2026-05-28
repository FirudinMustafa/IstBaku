/**
 * Shared zod schemas — single source of truth for client-side form validation.
 *
 * Conventions:
 * - Strings are `.trim()`ed and lowercased where appropriate.
 * - `min(1)` after `.trim()` to reject empty/whitespace-only submissions (MH-27).
 * - Phone & email use stricter regexes than the previous ad-hoc checks.
 * - Use `safeParse(...)` in consumers and feed `flatten().fieldErrors[fieldName]?.[0]`
 *   straight into `<Input error={...} />`.
 */
import { z } from 'zod';
import {
  ROOM_VALUES, HOUSING_TYPE_VALUES, ENERGY_CLASS_VALUES,
  FACADE_VALUES, BUILDING_STATUS_VALUES, STRUCTURE_TYPE_VALUES,
} from '@/lib/constants/listing-options';

/* -------------------------------------------------------------------------- */
/* Reusable primitives                                                         */
/* -------------------------------------------------------------------------- */

/** Email — trimmed, lowercased, RFC-lite. */
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'E-posta zorunlu')
  .max(254, 'E-posta çok uzun')
  .regex(
    /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i,
    'Geçerli bir e-posta adresi gir',
  );

/** Password — at least 8 chars, blocks common-empty strings. */
export const passwordField = z
  .string()
  .min(8, 'Şifre en az 8 karakter olmalı')
  .max(72, 'Şifre çok uzun (en fazla 72 karakter)');

/** Strong password — used on sign-up & reset. */
export const strongPasswordField = passwordField
  .refine((p) => /[A-Za-z]/.test(p), {
    message: 'Şifre en az bir harf içermeli',
  })
  .refine((p) => /[0-9]/.test(p), {
    message: 'Şifre en az bir rakam içermeli',
  });

/** Phone — digits only after normalization, 6-15 chars. */
export const phoneField = z
  .string()
  .trim()
  .min(1, 'Telefon zorunlu')
  .transform((v) => v.replace(/[^\d]/g, ''))
  .pipe(z.string().regex(/^\d{6,15}$/, 'Geçerli bir telefon numarası gir (6-15 rakam)'));

/** Optional phone field (allows empty string). */
export const optionalPhoneField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d]/g, ''))
  .pipe(z.string().regex(/^(\d{6,15})?$/, 'Geçerli bir telefon numarası gir'))
  .optional();

/** Trimmed display name. */
export const nameField = z
  .string()
  .trim()
  .min(2, 'En az 2 karakter olmalı')
  .max(80, 'En fazla 80 karakter olabilir')
  .regex(/[\p{L}]/u, 'Ad en az bir harf içermeli');

/** Country dial codes (E.164-style "+xx"). */
export const dialField = z
  .string()
  .trim()
  .regex(/^\+\d{1,4}$/, 'Geçersiz ülke kodu');

/** Six-digit OTP. */
export const otpField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Lütfen 6 haneli kodu eksiksiz gir');

/** Required non-empty trimmed text with bounds. */
export const text = (min = 1, max = 200, msg = 'Bu alan zorunlu') =>
  z.string().trim().min(min, msg).max(max, `En fazla ${max} karakter`);

/* -------------------------------------------------------------------------- */
/* AUTH                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * PB-03: public sign-up role selector. Whitelist only — admin/super_admin/
 * moderator are never accepted from public sign-up payloads.
 */
export const publicSignUpRole = z.enum(['user', 'agent', 'office']);

export const signUpSchema = z.object({
  name: nameField,
  email: emailField,
  password: strongPasswordField,
  phoneDial: dialField,
  phone: phoneField,
  role: publicSignUpRole.optional().default('user'),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Devam etmek için şartları kabul etmelisin' }),
  }),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Şifre zorunlu').max(72),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(16, 'Geçersiz link').max(256),
    password: strongPasswordField,
    confirm: z.string().min(1, 'Şifreyi tekrar gir'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirm'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyCodeSchema = z.object({
  email: emailField,
  code: otpField,
});
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;

/* -------------------------------------------------------------------------- */
/* NEW LISTING (7-step wizard)                                                 */
/* -------------------------------------------------------------------------- */

export const listingType = z.enum([
  'konut',
  'luks_konut',
  'villa',
  'is_yeri',
  'arsa',
  'proje',
  'bina',
  'turistik_tesis',
  'devre_mulk',
]);

export const listingPurpose = z.enum(['sale', 'rent', 'daily_rent']);
export const listingCountry = z.string().trim().min(2, 'Ülke zorunlu').max(8);
export const listingCurrency = z.enum(['USD', 'EUR', 'TRY', 'AZN']);
export const listingRooms = z.enum(ROOM_VALUES);
export const listingHousingType = z.enum(HOUSING_TYPE_VALUES);
export const listingEnergyClass = z.enum(ENERGY_CLASS_VALUES);
export const listingOwnerType = z.enum(['sahibi', 'emlakci', 'insaat', 'banka']);
export const listingStatus = z.enum(['bos', 'kiracili', 'mulk_sahibi']);
export const listingTitleDeed = z.enum(['kat_mulkiyeti', 'kat_irtifaki', 'arsa_payi', 'cikti_belgesi', 'belirsiz']);
export const listingHeating = z.enum([
  'Kombi',
  'Merkezi',
  'Merkezi (Doğalgaz)',
  'Yerden ısıtma',
  'Klima',
  'Yok',
]);
export const listingParking = z.enum(['kapali', 'acik', 'yok']);
export const listingTier = z.enum(['standart', 'guclu', 'premium']);
export const listingCoverKind = z.enum(['photo', 'video']);

export const createListingSchema = z.object({
  /* Step 1: type & purpose */
  type: listingType,
  purpose: listingPurpose,
  /* Step 2: location */
  country: listingCountry,
  city: text(1, 64, 'Şehir zorunlu'),
  district: text(1, 64, 'İlçe zorunlu'),
  neighborhood: z.string().trim().max(64).optional(),
  address: text(3, 200, 'Adres en az 3 karakter olmalı'),
  lat: z
    .number()
    .finite('Geçerli enlem değeri gir')
    .gte(-90, 'Enlem -90 ile 90 arasında olmalı')
    .lte(90, 'Enlem -90 ile 90 arasında olmalı')
    .refine((n) => n !== 0, 'Konumu haritadan seç'),
  lng: z
    .number()
    .finite('Geçerli boylam değeri gir')
    .gte(-180, 'Boylam -180 ile 180 arasında olmalı')
    .lte(180, 'Boylam -180 ile 180 arasında olmalı')
    .refine((n) => n !== 0, 'Konumu haritadan seç'),
  /* Step 3: physical */
  rooms: listingRooms,
  bathrooms: z.number().int().min(1).max(20),
  netArea: z.number().int().min(1, 'Net alan zorunlu').max(100000),
  grossArea: z.number().int().min(1, 'Brüt alan zorunlu').max(100000),
  floor: z.number().int().min(-5).max(200),
  totalFloors: z.number().int().min(1).max(200),
  buildingAge: z.number().int().min(0).max(500),
  heating: listingHeating,
  parking: listingParking,
  /* Step 3: ek detaylar */
  housingType: listingHousingType.optional(),
  energyClass: listingEnergyClass.optional(),
  facade: z.enum(FACADE_VALUES).optional(),
  buildingStatus: z.enum(BUILDING_STATUS_VALUES).optional(),
  structureType: z.enum(STRUCTURE_TYPE_VALUES).optional(),
  permitNo: z.string().trim().max(64).optional(),
  parcelNo: z.string().trim().max(64).optional(),
  dues: z.number().int().min(0).max(1_000_000).optional(),
  deposit: z.number().int().min(0).max(1_000_000_000).optional(),
  loanEligible: z.boolean().optional(),
  ownerType: listingOwnerType.optional(),
  titleDeed: listingTitleDeed.optional(),
  occupancy: listingStatus.optional(),
  elevator: z.boolean().optional(),
  furnished: z.boolean().optional(),
  balcony: z.boolean().optional(),
  pool: z.boolean().optional(),
  gym: z.boolean().optional(),
  inSite: z.boolean().optional(),
  swappable: z.boolean().optional(),
  siteName: z.string().trim().max(120).optional(),
  /* opsiyonel kullanıcı başlığı — boşsa otomatik üretilir */
  customTitle: z.string().trim().max(200).optional(),
  /* Step 4: price */
  price: z
    .number()
    .finite('Geçerli fiyat gir')
    .positive('Fiyat pozitif olmalı')
    .max(1e10, 'Fiyat çok yüksek'),
  currency: listingCurrency,
  /* Step 5: media */
  coverKind: listingCoverKind,
  coverPhotoIndex: z.number().int().min(0).max(11),
  photoDataUrls: z
    .array(z.string().startsWith('data:image/', 'Sadece görsel yükleyebilirsin'))
    .min(3, 'En az 3 fotoğraf gerekli')
    .max(12, 'En fazla 12 fotoğraf yükleyebilirsin'),
  coverVideoDataUrl: z
    .string()
    .startsWith('data:video/', 'Sadece video yükleyebilirsin')
    .optional(),
  /* Step 6: description */
  description: text(20, 5000, 'Açıklama en az 20 karakter olmalı'),
  /* Step 7: tier & region */
  tier: listingTier,
  region: z
    .object({
      aile: z.number().int().min(0).max(100),
      memur: z.number().int().min(0).max(100),
      ogrenci: z.number().int().min(0).max(100),
      yabanci: z.number().int().min(0).max(100),
    })
    .refine(
      (r) => r.aile + r.memur + r.ogrenci + r.yabanci <= 100,
      { message: 'Bölge profili toplamı 100\'ü geçemez', path: ['aile'] },
    ),
  /* Step 7: yakın çevre (opsiyonel) */
  nearby: z.object({
    metro:   z.object({ name: z.string(), minutes: z.number().min(0).max(180), km: z.number().min(0).max(50) }).optional(),
    okul:    z.object({ name: z.string(), minutes: z.number().min(0).max(180), km: z.number().min(0).max(50) }).optional(),
    hastane: z.object({ name: z.string(), minutes: z.number().min(0).max(180), km: z.number().min(0).max(50) }).optional(),
    avm:     z.object({ name: z.string(), minutes: z.number().min(0).max(180), km: z.number().min(0).max(50) }).optional(),
    park:    z.object({ name: z.string(), minutes: z.number().min(0).max(180), km: z.number().min(0).max(50) }).optional(),
    eczane:  z.object({ name: z.string(), minutes: z.number().min(0).max(180), km: z.number().min(0).max(50) }).optional(),
    eglence: z.object({ name: z.string(), minutes: z.number().min(0).max(180), km: z.number().min(0).max(50) }).optional(),
    markets: z.array(z.object({ name: z.string().min(1), minutes: z.number().min(0).max(180), km: z.number().min(0).max(50) })).max(10).optional(),
  }).optional(),
  /* Step 8: günlük kira (opsiyonel) */
  dailyRentalEnabled: z.boolean().optional(),
  dailyRentalPricePerNight: z.number().int().positive().max(100000).optional(),
  dailyRentalCurrency: listingCurrency.optional(),
  dailyRentalMinNights: z.number().int().min(1).max(30).optional(),
  dailyRentalNotes: text(0, 1000).optional(),
}).refine(
  (d) => !d.dailyRentalEnabled || (d.dailyRentalPricePerNight && d.dailyRentalPricePerNight > 0),
  { message: 'Günlük kira açıksa gecelik fiyat zorunlu', path: ['dailyRentalPricePerNight'] },
);
export type CreateListingInput = z.infer<typeof createListingSchema>;

/* -------------------------------------------------------------------------- */
/* MESSAGES & APPOINTMENTS                                                     */
/* -------------------------------------------------------------------------- */

export const messageSchema = z.object({
  toUserId: z.string().min(1, 'Alıcı zorunlu').max(64),
  listingId: z.string().min(1).max(64).optional(),
  listingTitle: z.string().max(200).optional(),
  content: z.string().trim().min(2, 'Mesaj en az 2 karakter olmalı').max(4000, 'Mesaj çok uzun (en fazla 4000 karakter)'),
});
export type MessageInput = z.infer<typeof messageSchema>;

export const appointmentSchema = z.object({
  listingId: z.string().min(1).max(64),
  agentId: z.string().min(1).max(64),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli bir tarih seç'),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Geçerli bir saat seç'),
  visitorName: nameField,
  visitorEmail: emailField,
  visitorPhone: phoneField,
  notes: z.string().trim().max(500, 'Not en fazla 500 karakter olabilir').optional(),
}).refine(
  (d) => {
    // Date must be today or later
    const dt = new Date(`${d.date}T${d.time}:00`);
    if (!Number.isFinite(dt.getTime())) return false;
    return dt.getTime() > Date.now();
  },
  { message: 'Randevu tarihi gelecekte olmalı', path: ['date'] },
);
export type AppointmentInput = z.infer<typeof appointmentSchema>;

/* -------------------------------------------------------------------------- */
/* AI MATCH                                                                    */
/* -------------------------------------------------------------------------- */

export const aiMatchSchema = z.object({
  goals: z.array(z.string().min(1).max(40)).min(1, 'En az 1 amaç seç').max(8, 'En fazla 8 amaç'),
  countries: z.array(z.string().min(2).max(8)).min(1, 'En az bir ülke seç').max(10),
  maxBudgetUSD: z
    .number()
    .finite('Bütçe sayısal olmalı')
    .positive('Bütçe sıfırdan büyük olmalı')
    .max(1e9, 'Bütçe çok yüksek'),
  horizonYears: z
    .number()
    .int('Yıl tam sayı olmalı')
    .min(1, 'En az 1 yıl')
    .max(50, 'En fazla 50 yıl'),
  maxResults: z.number().int().min(1).max(50).optional(),
});
export type AiMatchInput = z.infer<typeof aiMatchSchema>;

/* -------------------------------------------------------------------------- */
/* USER-FACING ADMIN-DRIVEN FORMS                                              */
/* -------------------------------------------------------------------------- */

/** Abuse / complaint report — for the missing user-facing report form. */
export const reportSchema = z.object({
  targetType: z.enum(['listing', 'user', 'message'], {
    errorMap: () => ({ message: 'Şikayet türü seç' }),
  }),
  targetId: z.string().min(1, 'Hedef ID zorunlu').max(64),
  reason: z.enum(
    ['spam', 'fraud', 'inappropriate', 'duplicate', 'wrong_info', 'other'],
    { errorMap: () => ({ message: 'Bir sebep seç' }) },
  ),
  details: z
    .string()
    .trim()
    .min(10, 'Lütfen en az 10 karakter açıkla')
    .max(2000, 'Detay en fazla 2000 karakter olabilir'),
});
export type ReportInput = z.infer<typeof reportSchema>;

/** KYC submission — for the missing user-facing KYC form. */
export const kycSchema = z.object({
  fullName: nameField,
  idNumber: z
    .string()
    .trim()
    .min(5, 'Kimlik numarası en az 5 hane olmalı')
    .max(32, 'Kimlik numarası çok uzun')
    .regex(/^[A-Za-z0-9-]+$/, 'Sadece harf, rakam ve tire kullan'),
  documents: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        url: z
          .string()
          .url('Geçerli bir URL gir')
          .refine((u) => /^https?:\/\//i.test(u), 'Sadece https/http URL\'leri'),
      }),
    )
    .min(1, 'En az 1 belge yükle')
    .max(10, 'En fazla 10 belge'),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'KVKK metnini kabul etmelisin' }),
  }),
});
export type KycInput = z.infer<typeof kycSchema>;

/** Profile update — for the missing user profile form. */
export const profileUpdateSchema = z.object({
  name: nameField,
  email: emailField,
  phoneDial: dialField,
  phone: phoneField,
  avatarUrl: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), 'Sadece https/http URL\'leri')
    .optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Convert a `safeParse(...)` failure into a flat field→message map.
 * Returns `{}` when there are no errors so consumers can iterate safely.
 */
export function fieldErrors<T extends z.ZodTypeAny>(result: z.SafeParseReturnType<unknown, z.infer<T>>): Record<string, string> {
  if (result.success) return {};
  const flat = result.error.flatten();
  const out: Record<string, string> = {};
  for (const [key, list] of Object.entries(flat.fieldErrors)) {
    const arr = list as string[] | undefined;
    if (arr && arr.length > 0) out[key] = arr[0];
  }
  // Surface top-level form errors under `_form`
  if (flat.formErrors.length > 0) out._form = flat.formErrors[0];
  return out;
}
