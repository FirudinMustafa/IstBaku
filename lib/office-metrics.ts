/**
 * Ofis performans / rütbe mantığı (EnParaliol benzeri — müşteriye KAPALI).
 *
 * Aylık 12 kriter değerlendirilir:
 *  - İlk 8 kriterin TAMAMI → "Premium Office"
 *  - 12 kriterin TAMAMI    → "Gold Partner"
 *
 * Bazı kriterler için doğrudan veri yoksa makul vekil (proxy) ölçüler kullanılır
 * (örn. yorum kalitesi için agents.rating). Bu modül SAF mantıktır; veri toplama
 * `lib/office-actions.ts` içindedir.
 */

export type OfficeTier = 'none' | 'premium_office' | 'gold_partner';

/** Bir ajan/ofis için ham ölçüler. */
export interface OfficeStats {
  activeListings: number;
  avgRating: number;       // 0..5 (agents.rating)
  responseMins: number;    // ortalama dönüş süresi (dk)
  verified: boolean;       // hesap/ilan bilgisi doğruluğu (proxy)
  avgPhotoCount: number;   // ilan başına ortalama foto
  avgDescLen: number;      // ilan başına ortalama açıklama uzunluğu
  videoRatio: number;      // 0..1
  tour360Ratio: number;    // 0..1
  complaintRatio: number;  // 0..1 (ilan başına açık şikayet)
  soldClosedCount: number; // ay içinde satış/kira ile kapanan ilan
}

export interface CriterionDef {
  id: number;            // 1..12
  label: string;         // TR açıklama
  test: (s: OfficeStats) => boolean;
}

// 1..8 → Premium Office bandı; 9..12 → Gold Partner ek bandı.
export const OFFICE_CRITERIA: CriterionDef[] = [
  { id: 1,  label: 'Aylık minimum 20 aktif ilan',                         test: (s) => s.activeListings >= 20 },
  { id: 2,  label: '4 puan altı yorum oranının düşük olması',             test: (s) => s.avgRating >= 4.0 },
  { id: 3,  label: 'Mesaj/aramalara hızlı geri dönüş (≤30 dk)',           test: (s) => s.responseMins > 0 && s.responseMins <= 30 },
  { id: 4,  label: 'İlan ve hesap bilgilerinin doğruluğu',               test: (s) => s.verified },
  { id: 5,  label: 'Minimum HD kalitesinde foto (ilan başına ≥5)',        test: (s) => s.avgPhotoCount >= 5 },
  { id: 6,  label: 'Açıklamaların detaylı olması (≥300 karakter)',        test: (s) => s.avgDescLen >= 300 },
  { id: 7,  label: 'Video ilan oranı ≥ %40',                             test: (s) => s.videoRatio >= 0.40 },
  { id: 8,  label: 'Şikayet oranı ≤ %0.5',                               test: (s) => s.complaintRatio <= 0.005 },
  { id: 9,  label: 'Aylık minimum 60 aktif ilan',                        test: (s) => s.activeListings >= 60 },
  { id: 10, label: '360° turlu ilan oranı ≥ %80',                        test: (s) => s.tour360Ratio >= 0.80 },
  { id: 11, label: 'Son 3 ay ≥ 4.8 kullanıcı puanı ortalaması',          test: (s) => s.avgRating >= 4.8 },
  { id: 12, label: 'Satış/kira ile kapanmış aylık ≥ 4 ilan',            test: (s) => s.soldClosedCount >= 4 },
];

/** Karşılanan kriter id listesini döndürür. */
export function metCriteria(stats: OfficeStats): number[] {
  return OFFICE_CRITERIA.filter((c) => c.test(stats)).map((c) => c.id);
}

/** Karşılanan kriterlere göre rütbe. İlk 8 → premium_office, 12 → gold_partner. */
export function tierFromMet(met: number[]): OfficeTier {
  const set = new Set(met);
  const first8 = [1, 2, 3, 4, 5, 6, 7, 8].every((id) => set.has(id));
  const all12 = first8 && [9, 10, 11, 12].every((id) => set.has(id));
  if (all12) return 'gold_partner';
  if (first8) return 'premium_office';
  return 'none';
}

export function evaluateOffice(stats: OfficeStats): { criteriaMet: number[]; tier: OfficeTier } {
  const criteriaMet = metCriteria(stats);
  return { criteriaMet, tier: tierFromMet(criteriaMet) };
}

export const TIER_LABEL: Record<OfficeTier, string> = {
  none: 'Standart',
  premium_office: 'Premium Office',
  gold_partner: 'Gold Partner',
};
