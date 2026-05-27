import AIMatchClient from './AIMatchClient';
import { getCountriesWithListings, getActiveCountries } from '@/lib/queries/countries';

export default async function AIMatchPage() {
  // İlanlarda gerçekten var olan ülkeler + master listedeki aktif olanlar.
  // İkisi de boşsa fallback olarak TR/AZ döner (helper içinde).
  const [withListings, active] = await Promise.all([
    getCountriesWithListings('tr'),
    getActiveCountries('tr'),
  ]);
  // Listings'de olan ülkeler önce, sonra master listedeki diğer aktif ülkeler.
  const seen = new Set<string>();
  const merged = [...withListings, ...active].filter((c) => {
    if (seen.has(c.code)) return false;
    seen.add(c.code);
    return true;
  });
  return <AIMatchClient availableCountries={merged} />;
}
