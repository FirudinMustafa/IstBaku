/**
 * Tek kaynak — ilan formu ve filtreler aynı seçenekleri buradan alır.
 * İlan verme (NewListingClient), zod (lib/schemas), ve FilterSidebar tutarlı kalsın diye.
 */

/** Oda sayıları — Türkiye emlak standardı. `value` DB'de saklanan, `label` gösterilen. */
export const ROOM_OPTIONS: { value: string; label: string }[] = [
  { value: '1+0', label: 'Stüdyo (1+0)' },
  { value: '1+1', label: '1+1' },
  { value: '1.5+1', label: '1.5+1' },
  { value: '2+0', label: '2+0' },
  { value: '2+1', label: '2+1' },
  { value: '2.5+1', label: '2.5+1' },
  { value: '2+2', label: '2+2' },
  { value: '3+0', label: '3+0' },
  { value: '3+1', label: '3+1' },
  { value: '3.5+1', label: '3.5+1' },
  { value: '3+2', label: '3+2' },
  { value: '3+3', label: '3+3' },
  { value: '4+0', label: '4+0' },
  { value: '4+1', label: '4+1' },
  { value: '4.5+1', label: '4.5+1' },
  { value: '4.5+2', label: '4.5+2' },
  { value: '4+2', label: '4+2' },
  { value: '4+3', label: '4+3' },
  { value: '4+4', label: '4+4' },
  { value: '5+1', label: '5+1' },
  { value: '5.5+1', label: '5.5+1' },
  { value: '5+2', label: '5+2' },
  { value: '5+3', label: '5+3' },
  { value: '5+4', label: '5+4' },
  { value: '6+1', label: '6+1' },
  { value: '6+2', label: '6+2' },
  { value: '6.5+1', label: '6.5+1' },
  { value: '6+3', label: '6+3' },
  { value: '6+4', label: '6+4' },
  { value: '7+1', label: '7+1' },
  { value: '7+2', label: '7+2' },
  { value: '7+3', label: '7+3' },
  { value: '8+1', label: '8+1' },
  { value: '8+2', label: '8+2' },
  { value: '8+3', label: '8+3' },
  { value: '8+4', label: '8+4' },
  { value: '9+1', label: '9+1' },
  { value: '9+2', label: '9+2' },
  { value: '9+3', label: '9+3' },
  { value: '9+4', label: '9+4' },
  { value: '9+5', label: '9+5' },
  { value: '9+6', label: '9+6' },
  { value: '10+1', label: '10+1' },
  { value: '10+2', label: '10+2' },
  { value: '10+', label: '10 Üzeri' },
];

export const ROOM_VALUES = ROOM_OPTIONS.map((r) => r.value) as [string, ...string[]];

/** Konut tipi (dubleks, tribleks, vb.). `belirtilmemis` varsayılan. */
export const HOUSING_TYPE_VALUES = [
  'belirtilmemis', 'dubleks', 'tribleks', 'en_ust_kat', 'ara_kat', 'ara_kat_dubleks',
  'bahce_dubleksi', 'cati_dubleksi', 'forleks', 'ters_dubleks',
] as const;
export type HousingType = (typeof HOUSING_TYPE_VALUES)[number];

const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  belirtilmemis: 'Belirtilmemiş', dubleks: 'Dubleks', tribleks: 'Tribleks',
  en_ust_kat: 'En Üst Kat', ara_kat: 'Ara Kat', ara_kat_dubleks: 'Ara Kat Dubleks',
  bahce_dubleksi: 'Bahçe Dubleksi', cati_dubleksi: 'Çatı Dubleksi',
  forleks: 'Forleks', ters_dubleks: 'Ters Dubleks',
};
export const HOUSING_TYPE_OPTIONS: { value: HousingType; label: string }[] =
  HOUSING_TYPE_VALUES.map((v) => ({ value: v, label: HOUSING_TYPE_LABELS[v] }));

/** Enerji kimlik belgesi sınıfı A–G + Muaf/Belirsiz. */
export const ENERGY_CLASS_VALUES = ['belirsiz', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'muaf'] as const;
export type EnergyClass = (typeof ENERGY_CLASS_VALUES)[number];

const ENERGY_CLASS_LABELS: Record<EnergyClass, string> = {
  belirsiz: 'Belirsiz', A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', muaf: 'Muaf',
};
export const ENERGY_CLASS_OPTIONS: { value: EnergyClass; label: string }[] =
  ENERGY_CLASS_VALUES.map((v) => ({ value: v, label: ENERGY_CLASS_LABELS[v] }));

/** Cephe / yön. */
export const FACADE_VALUES = [
  'belirtilmemis', 'kuzey', 'guney', 'dogu', 'bati',
  'kuzeydogu', 'kuzeybati', 'guneydogu', 'guneybati',
] as const;
export type Facade = (typeof FACADE_VALUES)[number];
const FACADE_LABELS: Record<Facade, string> = {
  belirtilmemis: 'Belirtilmemiş', kuzey: 'Kuzey', guney: 'Güney', dogu: 'Doğu', bati: 'Batı',
  kuzeydogu: 'Kuzeydoğu', kuzeybati: 'Kuzeybatı', guneydogu: 'Güneydoğu', guneybati: 'Güneybatı',
};
export const FACADE_OPTIONS: { value: Facade; label: string }[] =
  FACADE_VALUES.map((v) => ({ value: v, label: FACADE_LABELS[v] }));

/** Yapının durumu (sıfır / ikinci el / yapım aşamasında). */
export const BUILDING_STATUS_VALUES = ['belirtilmemis', 'sifir', 'ikinci_el', 'yapim_asamasinda'] as const;
export type BuildingStatus = (typeof BUILDING_STATUS_VALUES)[number];
const BUILDING_STATUS_LABELS: Record<BuildingStatus, string> = {
  belirtilmemis: 'Belirtilmemiş', sifir: 'Sıfır', ikinci_el: 'İkinci El', yapim_asamasinda: 'Yapım Aşamasında',
};
export const BUILDING_STATUS_OPTIONS: { value: BuildingStatus; label: string }[] =
  BUILDING_STATUS_VALUES.map((v) => ({ value: v, label: BUILDING_STATUS_LABELS[v] }));

/** Yapı tipi (betonarme / çelik / ahşap / yığma). */
export const STRUCTURE_TYPE_VALUES = ['belirtilmemis', 'betonarme', 'celik', 'ahsap', 'yigma', 'prefabrik'] as const;
export type StructureType = (typeof STRUCTURE_TYPE_VALUES)[number];
const STRUCTURE_TYPE_LABELS: Record<StructureType, string> = {
  belirtilmemis: 'Belirtilmemiş', betonarme: 'Betonarme', celik: 'Çelik', ahsap: 'Ahşap', yigma: 'Yığma', prefabrik: 'Prefabrik',
};
export const STRUCTURE_TYPE_OPTIONS: { value: StructureType; label: string }[] =
  STRUCTURE_TYPE_VALUES.map((v) => ({ value: v, label: STRUCTURE_TYPE_LABELS[v] }));
