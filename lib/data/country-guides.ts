// Ülke ev alım rehberleri — admin tarafında yüklenip yönetilebilir.
// Mock: localStorage'a kayıt + default seed.

export interface CountryGuide {
  iso: string;
  name: string;
  flag: string;
  description: string;
  pdfUrl: string;          // gerçekte signed S3/Blob URL; şimdilik mock /api/country-guide
  updatedAt: string;       // ISO
  pages: number;
  language: 'tr' | 'az' | 'en' | 'ru' | 'de' | 'zh';
}

export const DEFAULT_GUIDES: CountryGuide[] = [
  { iso: 'TR', name: 'Türkiye', flag: '🇹🇷', description: 'Türk vatandaşı olmayanlar için TR\'de ev alım rehberi: vergi no, tapu işlemleri, vatandaşlık avantajı, döviz girişi.', pdfUrl: '/api/country-guide?iso=TR', updatedAt: '2026-04-12', pages: 24, language: 'tr' },
  { iso: 'AZ', name: 'Azərbaycan', flag: '🇦🇿', description: 'Yabancılar için AZ\'de ev alım rehberi: VOEN, notar, ASAN Xidmət, oturum izni.', pdfUrl: '/api/country-guide?iso=AZ', updatedAt: '2026-03-28', pages: 22, language: 'az' },
  { iso: 'RU', name: 'Россия', flag: '🇷🇺', description: 'Rus vatandaşlarının TR ve AZ\'de ev alımı için resmi prosedürler ve döviz kuralları.', pdfUrl: '/api/country-guide?iso=RU', updatedAt: '2026-02-10', pages: 18, language: 'en' },
  { iso: 'IR', name: 'İran', flag: '🇮🇷', description: 'İranlı yatırımcılar için yurt dışında gayrimenkul alımı kılavuzu.', pdfUrl: '/api/country-guide?iso=IR', updatedAt: '2026-01-22', pages: 16, language: 'en' },
  { iso: 'AE', name: 'BAE', flag: '🇦🇪', description: 'Körfez yatırımcısı için yurt dışında hızlı satın alma yolu.', pdfUrl: '/api/country-guide?iso=AE', updatedAt: '2026-02-04', pages: 20, language: 'en' },
  { iso: 'DE', name: 'Deutschland', flag: '🇩🇪', description: 'Almanya\'dan Türkiye\'ye taşınmak ve mülk satın almak için kapsamlı kılavuz.', pdfUrl: '/api/country-guide?iso=DE', updatedAt: '2026-03-15', pages: 26, language: 'en' },
];

export const GUIDE_STORAGE_KEY = 'istbaku-country-guides';

export function loadGuides(): CountryGuide[] {
  if (typeof window === 'undefined') return DEFAULT_GUIDES;
  try {
    const raw = localStorage.getItem(GUIDE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_GUIDES;
}

export function saveGuides(guides: CountryGuide[]) {
  try { localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(guides)); } catch {}
}
