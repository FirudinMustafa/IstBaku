// Tek noktadan TR etiketler — enum değerleri ham gösterilmesin.

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  konut: 'Konut',
  luks_konut: 'Lüks Konut',
  villa: 'Villa',
  is_yeri: 'İş Yeri',
  arsa: 'Arsa',
  proje: 'Proje',
  bina: 'Bina',
  turistik_tesis: 'Turistik Tesis',
  devre_mulk: 'Devre Mülk',
};

export const OWNER_TYPE_LABEL: Record<string, string> = {
  sahibi: 'Sahibinden',
  emlakci: 'Emlakçı',
  insaat: 'İnşaat Firması',
  banka: 'Banka',
};

export const TITLE_DEED_LABEL: Record<string, string> = {
  kat_mulkiyeti: 'Kat Mülkiyeti',
  kat_irtifaki: 'Kat İrtifakı',
  arsa_payi: 'Arsa Payı',
  cikti_belgesi: 'Çıktı Belgesi',
  belirsiz: 'Belirsiz',
};

export const STATUS_LABEL: Record<string, string> = {
  bos: 'Boş',
  kiracili: 'Kiracılı',
  mulk_sahibi: 'Mülk sahibi oturuyor',
};

export const PARKING_LABEL: Record<string, string> = {
  kapali: 'Kapalı',
  acik: 'Açık',
  yok: 'Yok',
};

export const HEATING_LABEL = (raw: string) => (raw === 'yok' ? 'Yok' : raw);

export function formatFloor(n: number): string {
  if (n === 0) return 'Zemin';
  if (n < 0) return `${Math.abs(n)}. Bodrum`;
  return `${n}. Kat`;
}

export const PURPOSE_LABEL: Record<string, string> = {
  sale: 'Satılık',
  rent: 'Kiralık',
  daily_rent: 'Günlük Kiralık',
};

export const HOUSING_TYPE_LABEL: Record<string, string> = {
  belirtilmemis: 'Belirtilmemiş',
  dubleks: 'Dubleks',
  tribleks: 'Tribleks',
  en_ust_kat: 'En Üst Kat',
  ara_kat: 'Ara Kat',
  ara_kat_dubleks: 'Ara Kat Dubleks',
  bahce_dubleksi: 'Bahçe Dubleksi',
  cati_dubleksi: 'Çatı Dubleksi',
  forleks: 'Forleks',
  ters_dubleks: 'Ters Dubleks',
};

export const ENERGY_CLASS_LABEL: Record<string, string> = {
  A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G',
  muaf: 'Muaf', belirsiz: 'Belirsiz',
};

export const FACADE_LABEL: Record<string, string> = {
  belirtilmemis: 'Belirtilmemiş', kuzey: 'Kuzey', guney: 'Güney', dogu: 'Doğu', bati: 'Batı',
  kuzeydogu: 'Kuzeydoğu', kuzeybati: 'Kuzeybatı', guneydogu: 'Güneydoğu', guneybati: 'Güneybatı',
};

export const BUILDING_STATUS_LABEL: Record<string, string> = {
  belirtilmemis: 'Belirtilmemiş', sifir: 'Sıfır', ikinci_el: 'İkinci El', yapim_asamasinda: 'Yapım Aşamasında',
};

export const STRUCTURE_TYPE_LABEL: Record<string, string> = {
  belirtilmemis: 'Belirtilmemiş', betonarme: 'Betonarme', celik: 'Çelik', ahsap: 'Ahşap', yigma: 'Yığma', prefabrik: 'Prefabrik',
};

export const TIER_LABEL: Record<string, string> = {
  standart: 'Standart',
  guclu: 'Güçlü',
  premium: 'Premium',
};

// Hangi alanlar hangi tür için gösterilmeli?
export function showsField(type: string, field: 'rooms' | 'bathrooms' | 'floor' | 'buildingAge' | 'furnished' | 'elevator'): boolean {
  if (type === 'arsa') return false; // arsa'da hiçbiri
  if (type === 'is_yeri') return field === 'floor' || field === 'buildingAge' || field === 'elevator';
  if (type === 'proje' || type === 'bina') return field !== 'furnished';
  return true;
}

export const DEMOGRAPHIC_LABELS: Record<string, string> = {
  aile: 'Aile',
  memur: 'Memur',
  ogrenci: 'Öğrenci',
  yabanci: 'Yabancı Uyruklu',
  diger: 'Diğer',
};

export interface CountryCode { iso: string; dial: string; name: string; flag: string; }

export const COUNTRY_CODES: CountryCode[] = [
  { iso: 'TR', dial: '+90',  name: 'Türkiye',        flag: '🇹🇷' },
  { iso: 'AZ', dial: '+994', name: 'Azərbaycan',     flag: '🇦🇿' },
  { iso: 'RU', dial: '+7',   name: 'Россия',         flag: '🇷🇺' },
  { iso: 'IR', dial: '+98',  name: 'ایران',          flag: '🇮🇷' },
  { iso: 'AE', dial: '+971', name: 'UAE',            flag: '🇦🇪' },
  { iso: 'SA', dial: '+966', name: 'Saudi Arabia',   flag: '🇸🇦' },
  { iso: 'DE', dial: '+49',  name: 'Deutschland',    flag: '🇩🇪' },
  { iso: 'GB', dial: '+44',  name: 'United Kingdom', flag: '🇬🇧' },
  { iso: 'US', dial: '+1',   name: 'United States',  flag: '🇺🇸' },
  { iso: 'FR', dial: '+33',  name: 'France',         flag: '🇫🇷' },
  { iso: 'IT', dial: '+39',  name: 'Italia',         flag: '🇮🇹' },
  { iso: 'NL', dial: '+31',  name: 'Nederland',      flag: '🇳🇱' },
  { iso: 'QA', dial: '+974', name: 'Qatar',          flag: '🇶🇦' },
  { iso: 'KZ', dial: '+7',   name: 'Қазақстан',      flag: '🇰🇿' },
  { iso: 'UZ', dial: '+998', name: 'O‘zbekiston',    flag: '🇺🇿' },
  { iso: 'GE', dial: '+995', name: 'საქართველო',     flag: '🇬🇪' },
];

/** Yıl bazlı üyelik süresi: "2 yıl 3 ay" */
export function membershipDuration(iso: string): string {
  const since = new Date(iso);
  const now = new Date();
  let months = (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth());
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const m = months % 12;
  if (years === 0) return m === 0 ? 'yeni üye' : `${m} ay`;
  if (m === 0) return `${years} yıl`;
  return `${years} yıl ${m} ay`;
}
