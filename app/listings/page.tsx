import { Suspense } from 'react';
import { ListingsClient } from './ListingsClient';
import { getPublicListings } from '@/lib/db-queries';
import { getCountriesWithListings, getActiveCountries } from '@/lib/queries/countries';

// MH-19 — public catalog; ISR with 1h revalidate (client-side filtering keeps UX fresh).
export const revalidate = 3600;

export default async function ListingsPage() {
  let initial: Awaited<ReturnType<typeof getPublicListings>> = [];
  try {
    initial = await getPublicListings();
  } catch (e) {
    console.error('listings query failed', e);
  }

  // Dinamik ülke listesi: ilanlarda var olanlar + master listedeki diğer aktifler.
  const [withListings, active] = await Promise.all([
    getCountriesWithListings('tr'),
    getActiveCountries('tr'),
  ]);
  const seen = new Set<string>();
  const countries = [...withListings, ...active].filter((c) => {
    if (seen.has(c.code)) return false;
    seen.add(c.code);
    return true;
  });

  return (
    <Suspense fallback={<div className="w-full px-4 py-12 text-[color:var(--fg-muted)]">Yükleniyor…</div>}>
      <ListingsClient initialListings={initial} countries={countries} />
    </Suspense>
  );
}
