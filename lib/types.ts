// Country artık dinamik — ISO-3166 alpha-2 string. 'TR' ve 'AZ' core listede,
// admin tarafından genişletilebilir (bkz. `countries` tablosu).
export type Country = string;
export type Currency = 'TRY' | 'AZN' | 'USD' | 'EUR';
export type Lang = 'tr' | 'az' | 'en' | 'ru' | 'de' | 'zh';

export type PropertyType =
  | 'konut'
  | 'luks_konut'
  | 'villa'
  | 'is_yeri'
  | 'arsa'
  | 'proje'
  | 'bina'
  | 'turistik_tesis'
  | 'devre_mulk';

export type ListingPurpose = 'sale' | 'rent' | 'daily_rent';
export type ListingTier = 'standart' | 'guclu' | 'premium';
export type OwnerType = 'sahibi' | 'emlakci' | 'insaat' | 'banka';
export type UserGoal = 'oturum' | 'kira' | 'yazlik' | 'yatirim';

export interface Coordinates { lat: number; lng: number; }

export interface Region {
  id: string;
  country: Country;
  city: string;
  district: string;
  neighborhood?: string;
  /** AI - demand index 0-100 */
  demandIndex: number;
  /** YoY price change % */
  priceTrendYoY: number;
  /** Avg rent yield % */
  rentYield: number;
  /** Foreign investor interest 0-100 */
  foreignInterest: number;
}

export interface InvestmentScore {
  total: number;        // 0-100
  region: number;
  price: number;
  rentYield: number;
  demand: number;
  reasoning: string;    // human-readable XAI
}

export interface Agent {
  id: string;
  name: string;
  agency?: string;
  avatar: string;
  phone: string;
  whatsapp: string;
  rating: number;       // 0-5
  reviewsCount: number;
  responseMins: number;
  verified: boolean;
  performance: number;  // 0-100
  listingsCount: number;
  language: Lang[];
  memberSince: string;  // ISO date
  bio?: string;
}

/** Bölgede yaşayan profil dağılımı (% toplam ≈ 100). İlan veren bunu seçer. */
export interface RegionProfile {
  aile: number;
  memur: number;
  ogrenci: number;
  yabanci: number;
  diger: number;
}

/** Yakın POI - mesafeler dakika cinsinden (yürüme/araba). */
export interface POIEntry { name: string; minutes: number; km: number }
export interface NearbyPOI {
  metro?: POIEntry;
  okul?: POIEntry;
  hastane?: POIEntry;
  avm?: POIEntry;
  park?: POIEntry;
  /** Birden çok market girilebilir (Bravo, Migros, A101, vb.). Eski veri tek obje olabilir; render eden normalize eder. */
  market?: POIEntry | POIEntry[];
  eczane?: POIEntry;
  eglence?: POIEntry;
}

export type CoverKind = 'photo' | 'video';
export interface ListingCover { kind: CoverKind; src: string; }

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: PropertyType;
  purpose: ListingPurpose;
  tier: ListingTier;
  country: Country;
  city: string;
  district: string;
  neighborhood?: string;
  address: string;
  coords: Coordinates;
  price: number;
  currency: Currency;
  area: { net: number; gross: number };
  rooms: string;          // "2+1" / "3+1" / "studio"
  bathrooms: number;
  floor: number;
  totalFloors: number;
  buildingAge: number;
  heating: string;
  parking: 'kapali' | 'acik' | 'yok';
  balcony: boolean;
  furnished: boolean;
  elevator: boolean;
  pool: boolean;
  gym: boolean;
  sauna: boolean;
  inSite: boolean;
  status: 'bos' | 'kiracili' | 'mulk_sahibi';
  ownerType: OwnerType;
  titleDeed: 'kat_mulkiyeti' | 'kat_irtifaki' | 'arsa_payi' | 'cikti_belgesi' | 'belirsiz';
  swappable: boolean;
  loanEligible?: boolean;
  deposit?: number;
  housingType?: string;
  energyClass?: string;
  facade?: string;
  buildingStatus?: string;
  structureType?: string;
  permitNo?: string;
  parcelNo?: string;
  siteName?: string;
  dues?: number;
  images: string[];
  video?: string;
  has360: boolean;
  aiVerified: boolean;
  istbakuApproved: boolean;
  approvalLevel: 0 | 1 | 2 | 3; // 0 none, 1 ID, 2 deed, 3 site visit
  publishedAt: string;
  views: number;
  favorites: number;
  agentId: string;
  score: InvestmentScore;
  isPrivate: boolean; // gizli portföy
  tags?: string[];
  /** Kapak: foto veya video (hover ile oynayan) */
  cover: ListingCover;
  /** Bölgede yaşayan profil dağılımı */
  regionProfile: RegionProfile;
  /** Yakın çevredeki POI'ler */
  nearby: NearbyPOI;
  /** PR5 — Günlük kira (opsiyonel; sahibi aktifleştirirse) */
  dailyRentalEnabled?: boolean;
  dailyRentalPricePerNight?: number;
  dailyRentalCurrency?: Currency;
  dailyRentalMinNights?: number;
  dailyRentalNotes?: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
  newMatches: number;
}

export type NotificationType =
  | 'match'
  | 'price_drop'
  | 'message'
  | 'system'
  | 'appointment'
  | 'approval'
  | 'kyc'
  | 'payment';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

export interface CompareEntry { propertyId: string; }

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'agent' | 'admin';
  premium: boolean;
  kycVerified: boolean;
  investorProfile?: {
    annualIncomeRange?: string;
    purposes: UserGoal[];
    countries: Country[];
  };
  preferences: {
    lang: Lang;
    currency: Currency;
  };
}

export interface FilterState {
  query?: string;
  type?: PropertyType[];
  purpose?: ListingPurpose;
  country?: Country;
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: Currency;
  rooms?: string[];
  bathrooms?: number;            // min banyo sayısı
  minArea?: number;              // net m² min
  maxArea?: number;              // net m² max
  minGrossArea?: number;         // brüt m² min
  maxGrossArea?: number;         // brüt m² max
  buildingMinAge?: number;
  buildingMaxAge?: number;
  minFloor?: number;
  maxFloor?: number;
  heating?: string[];            // ['kombi','merkezi','yerden','yok']
  features?: string[];
  housingType?: string[];        // konut tipi (dubleks, tribleks, ...)
  energyClass?: string[];        // A–G, muaf
  buildingStatus?: string[];     // sifir, ikinci_el, yapim_asamasinda
  structureType?: string[];      // betonarme, celik, ...
  facade?: string[];             // kuzey, guney, ...
  ownerType?: OwnerType[];
  status?: string[];             // ['bos','kiracili','mulk_sahibi']
  istbakuApproved?: boolean;
  withVideo?: boolean;
  with360?: boolean;
  swappable?: boolean;
  publishedWithin?: 'today' | '3d' | '7d' | '30d' | '90d';
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'score_desc';
}
