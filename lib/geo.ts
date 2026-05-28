// Coğrafi yardımcılar — kuş uçuşu mesafe (haversine) ve km→dakika tahmini.

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** İki koordinat arası kuş uçuşu (haversine) mesafe, km cinsinden. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Ortalama hız varsayımları (km/saat).
const WALK_KMH = 5;
const DRIVE_KMH = 30;

/**
 * km'den yaklaşık varış süresini (dakika) türetir.
 * Varsayılan yürüme (~5 km/h); 'drive' ile şehir içi araç (~30 km/h).
 * Boş/sıfır km → 0.
 */
export function kmToMinutes(km: number, mode: 'walk' | 'drive' = 'walk'): number {
  if (!Number.isFinite(km) || km <= 0) return 0;
  const speed = mode === 'drive' ? DRIVE_KMH : WALK_KMH;
  return Math.max(1, Math.round((km / speed) * 60));
}
