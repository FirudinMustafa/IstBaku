import type { Region } from '../types';

export const REGIONS: Region[] = [
  // TR
  { id: 'tr-ist-besiktas', country: 'TR', city: 'İstanbul', district: 'Beşiktaş', demandIndex: 92, priceTrendYoY: 14.2, rentYield: 4.1, foreignInterest: 88 },
  { id: 'tr-ist-kadikoy', country: 'TR', city: 'İstanbul', district: 'Kadıköy', demandIndex: 90, priceTrendYoY: 12.8, rentYield: 4.6, foreignInterest: 74 },
  { id: 'tr-ist-sariyer', country: 'TR', city: 'İstanbul', district: 'Sarıyer', demandIndex: 86, priceTrendYoY: 16.5, rentYield: 3.4, foreignInterest: 81 },
  { id: 'tr-ist-uskudar', country: 'TR', city: 'İstanbul', district: 'Üsküdar', demandIndex: 83, priceTrendYoY: 11.4, rentYield: 4.3, foreignInterest: 62 },
  { id: 'tr-ist-besyol', country: 'TR', city: 'İstanbul', district: 'Başakşehir', demandIndex: 76, priceTrendYoY: 9.6, rentYield: 5.1, foreignInterest: 58 },
  { id: 'tr-ank-cankaya', country: 'TR', city: 'Ankara', district: 'Çankaya', demandIndex: 72, priceTrendYoY: 8.4, rentYield: 4.8, foreignInterest: 36 },
  { id: 'tr-ant-konyaalti', country: 'TR', city: 'Antalya', district: 'Konyaaltı', demandIndex: 89, priceTrendYoY: 17.9, rentYield: 5.8, foreignInterest: 92 },
  { id: 'tr-ant-muratpasa', country: 'TR', city: 'Antalya', district: 'Muratpaşa', demandIndex: 84, priceTrendYoY: 15.1, rentYield: 5.4, foreignInterest: 86 },
  { id: 'tr-izm-konak', country: 'TR', city: 'İzmir', district: 'Konak', demandIndex: 78, priceTrendYoY: 10.2, rentYield: 4.9, foreignInterest: 54 },
  { id: 'tr-mug-bodrum', country: 'TR', city: 'Muğla', district: 'Bodrum', demandIndex: 91, priceTrendYoY: 19.4, rentYield: 6.2, foreignInterest: 95 },

  // AZ
  { id: 'az-bak-nesimi', country: 'AZ', city: 'Bakı', district: 'Nəsimi', demandIndex: 88, priceTrendYoY: 13.1, rentYield: 5.2, foreignInterest: 76 },
  { id: 'az-bak-yasamal', country: 'AZ', city: 'Bakı', district: 'Yasamal', demandIndex: 82, priceTrendYoY: 11.6, rentYield: 5.4, foreignInterest: 64 },
  { id: 'az-bak-narimanov', country: 'AZ', city: 'Bakı', district: 'Nərimanov', demandIndex: 85, priceTrendYoY: 12.2, rentYield: 5.0, foreignInterest: 71 },
  { id: 'az-bak-xetai', country: 'AZ', city: 'Bakı', district: 'Xətai', demandIndex: 79, priceTrendYoY: 10.4, rentYield: 5.6, foreignInterest: 58 },
  { id: 'az-bak-sebail', country: 'AZ', city: 'Bakı', district: 'Səbail', demandIndex: 94, priceTrendYoY: 16.8, rentYield: 4.4, foreignInterest: 92 },
  { id: 'az-bak-binagadi', country: 'AZ', city: 'Bakı', district: 'Binəqədi', demandIndex: 68, priceTrendYoY: 8.1, rentYield: 6.0, foreignInterest: 41 },
  { id: 'az-gan-kepez', country: 'AZ', city: 'Gəncə', district: 'Kəpəz', demandIndex: 62, priceTrendYoY: 7.4, rentYield: 6.4, foreignInterest: 28 },
  { id: 'az-sum-sumqayit', country: 'AZ', city: 'Sumqayıt', district: 'Mərkəz', demandIndex: 65, priceTrendYoY: 9.2, rentYield: 6.8, foreignInterest: 33 },
];

export function regionsByCountry(c: string) {
  return REGIONS.filter((r) => r.country === c);
}

export function findRegion(city: string, district?: string) {
  return REGIONS.find((r) => r.city === city && (!district || r.district === district));
}
