'use client';

import * as React from 'react';
import { neighborhoodsOf, neighborhoodsOfCity } from '@/lib/data/neighborhoods';

/**
 * G1 — il/ilçe için mahalle/semt önerileri. Önce /api/neighborhoods (tam veri seti),
 * boşsa statik küratörlü listeye düşer. Datalist (serbest metin) için kullanılır.
 */
export function useNeighborhoods(
  country?: string | null,
  city?: string | null,
  district?: string | null,
): string[] {
  const fallback = React.useMemo(
    () => (district ? neighborhoodsOf(country, city, district) : neighborhoodsOfCity(country, city)),
    [country, city, district],
  );
  const [names, setNames] = React.useState<string[]>(fallback);

  React.useEffect(() => {
    let alive = true;
    if (!country || !city) { setNames([]); return; }
    const qs = new URLSearchParams({ country, city });
    if (district) qs.set('district', district);
    fetch(`/api/neighborhoods?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setNames(Array.isArray(d.names) && d.names.length ? d.names : fallback);
      })
      .catch(() => { if (alive) setNames(fallback); });
    return () => { alive = false; };
  }, [country, city, district, fallback]);

  return names;
}
