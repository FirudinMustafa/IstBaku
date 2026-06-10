/**
 * Mahalle / semt / qəsəbə veri katmanı (Madde 3).
 *
 * Yapı: country → city → district → neighborhood[].
 * Ana pazarlar (Bakü rayonları + büyük İstanbul ilçeleri) doğru veriyle beslendi.
 * Veri OLMAYAN ilçelerde UI serbest-metin girişine (datalist boş) düşer; bu sayede
 * dataset zamanla kod değişmeden büyütülebilir (tam TR mahalle seti ayrı veri işi).
 */

type DistrictMap = Record<string, string[]>;
type CityMap = Record<string, DistrictMap>;
type CountryMap = Record<string, CityMap>;

// ============================================================
// AZ — BAKI (rayon → məhəllə/qəsəbə)
// ============================================================
const AZ_BAKU: DistrictMap = {
  'Səbail': ['Mərkəz', 'İçərişəhər', 'Bayıl', 'Badamdar', 'Bibiheybət', 'Şıxov'],
  'Nəsimi': ['28 May', 'Gənclik', 'Nizami küç.', 'Tbilisi prospekti', '8-ci kilometr'],
  'Nizami': ['Keşlə', '8-ci kilometr', 'Əhmədli (qismən)'],
  'Nərimanov': ['Nərimanov', 'Gənclik', 'Ağ şəhər', 'Sovetski (yeni)'],
  'Xətai': ['Əhmədli', 'Həzi Aslanov', 'Ağ şəhər', 'Köhnə Günəşli'],
  'Yasamal': ['Yasamal', 'Yeni Yasamal', '20 Yanvar', 'Memar Əcəmi', 'Həzi Aslanov küç.'],
  'Binəqədi': ['Binəqədi qəs.', '8-ci mikrorayon', '9-cu mikrorayon', 'Biləcəri', 'Xocəsən', '6-cı mkr', '7-ci mkr'],
  'Sabunçu': ['Sabunçu', 'Bakıxanov', 'Maştağa', 'Nardaran', 'Bilgəh', 'Ramana', 'Zabrat', 'Pirşağı', 'Kürdəxanı'],
  'Suraxanı': ['Suraxanı', 'Hövsan', 'Əmircan', 'Zığ', 'Qaraçuxur', 'Bülbülə', 'Yeni Suraxanı'],
  'Qaradağ': ['Qobustan qəs.', 'Lökbatan', 'Səngəçal', 'Ələt', 'Puta', 'Müşfiqabad', 'Şubanı'],
  'Xəzər': ['Mərdəkan', 'Şüvəlan', 'Buzovna', 'Türkan', 'Qala', 'Zirə', 'Dübəndi'],
  'Pirallahı': ['Pirallahı', 'Çilov', 'Neft Daşları'],
};

// AZ — diğer büyük şehirler (seçili merkezler)
const AZ_OTHER: CityMap = {
  'Sumqayıt': { 'Mərkəz': ['1-ci mikrorayon', '2-ci mikrorayon', '3-cü mikrorayon', 'Corat', 'Haci Zeynalabdin'] },
  'Gəncə': { 'Kəpəz': ['Kəpəz', 'Mərkəz'], 'Nizami': ['Nizami', 'Şəhər mərkəzi'] },
};

// ============================================================
// TR — büyük İstanbul ilçeleri (popüler mahalleler)
// ============================================================
const TR_ISTANBUL: DistrictMap = {
  'Beşiktaş': ['Levent', 'Etiler', 'Bebek', 'Ortaköy', 'Arnavutköy', 'Gayrettepe', 'Balmumcu', 'Dikilitaş', 'Nispetiye', 'Ulus'],
  'Kadıköy': ['Moda', 'Caddebostan', 'Fenerbahçe', 'Suadiye', 'Bostancı', 'Göztepe', 'Erenköy', 'Kozyatağı', 'Fikirtepe', 'Acıbadem', 'Koşuyolu'],
  'Şişli': ['Mecidiyeköy', 'Nişantaşı', 'Teşvikiye', 'Bomonti', 'Fulya', 'Esentepe', 'Gülbağ', 'Halaskargazi'],
  'Sarıyer': ['Maslak', 'İstinye', 'Tarabya', 'Yeniköy', 'Emirgan', 'Baltalimanı', 'Zekeriyaköy', 'Ayazağa'],
  'Beyoğlu': ['Cihangir', 'Galata', 'Karaköy', 'Taksim', 'Cibali', 'Tarlabaşı', 'Kasımpaşa'],
  'Üsküdar': ['Kuzguncuk', 'Çengelköy', 'Beylerbeyi', 'Acıbadem', 'Altunizade', 'Ümraniye sınırı', 'Kısıklı'],
  'Beylikdüzü': ['Cumhuriyet', 'Adnan Kahveci', 'Barış', 'Gürpınar', 'Yakuplu', 'Kavaklı', 'Marmara'],
  'Başakşehir': ['Kayaşehir', 'Başak', 'Güvercintepe', 'Ziya Gökalp', 'Bahçeşehir 1. Kısım', 'Bahçeşehir 2. Kısım'],
  'Ataşehir': ['Barbaros', 'Atatürk', 'Küçükbakkalköy', 'İçerenköy', 'Ferhatpaşa', 'Yenisahra'],
  'Maltepe': ['Bağlarbaşı', 'Cevizli', 'Küçükyalı', 'Fındıklı', 'Altayçeşme', 'Zümrütevler'],
};

// TR — diğer popüler şehir/ilçeler (turistik + büyük şehir merkezleri)
const TR_OTHER: CityMap = {
  'İzmir': {
    'Konak': ['Alsancak', 'Göztepe', 'Güzelyalı', 'Karataş', 'Basmane'],
    'Karşıyaka': ['Bostanlı', 'Mavişehir', 'Bahriye Üçok', 'Alaybey'],
    'Çeşme': ['Alaçatı', 'Ilıca', 'Dalyan', 'Çiftlik'],
  },
  'Muğla': {
    'Bodrum': ['Yalıkavak', 'Türkbükü', 'Gümbet', 'Gündoğan', 'Torba', 'Bitez', 'Turgutreis'],
    'Marmaris': ['İçmeler', 'Armutalan', 'Beldibi', 'Siteler'],
    'Fethiye': ['Çalış', 'Ölüdeniz', 'Hisarönü', 'Karagözler'],
  },
  'Antalya': {
    'Muratpaşa': ['Lara', 'Konyaaltı sınırı', 'Fener', 'Güzeloba'],
    'Konyaaltı': ['Liman', 'Hurma', 'Sarısu', 'Arapsuyu'],
    'Alanya': ['Mahmutlar', 'Oba', 'Kestel', 'Cikcilli', 'Tosmur'],
  },
};

const DATA: CountryMap = {
  AZ: { 'Bakı': AZ_BAKU, ...AZ_OTHER },
  TR: { 'İstanbul': TR_ISTANBUL, ...TR_OTHER },
};

// G1 seed (scripts/seed-neighborhoods.ts) AZ küratörlü verisini buradan okur.
export const ALL_NEIGHBORHOODS: CountryMap = DATA;

/**
 * Verilen ülke/şehir/ilçe için mahalle listesini döndürür. Veri yoksa boş dizi
 * (UI serbest-metin girişine düşer).
 */
export function neighborhoodsOf(country?: string | null, city?: string | null, district?: string | null): string[] {
  if (!country || !city || !district) return [];
  return DATA[country.toUpperCase()]?.[city]?.[district] ?? [];
}

/** O şehirdeki tüm mahalleleri (ilçe fark etmeksizin) — şehir seçili, ilçe seçili değilken öneri. */
export function neighborhoodsOfCity(country?: string | null, city?: string | null): string[] {
  if (!country || !city) return [];
  const cityMap = DATA[country.toUpperCase()]?.[city];
  if (!cityMap) return [];
  const all = new Set<string>();
  for (const list of Object.values(cityMap)) list.forEach((n) => all.add(n));
  return [...all].sort((a, b) => a.localeCompare(b, 'tr'));
}
