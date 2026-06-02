import 'server-only';
import { haversineKm, kmToMinutes, type LatLng } from './geo';

/**
 * Adres geocoding + yakın çevre (POI) otomatik mesafe hesabı.
 *
 * - Geocoding: OpenStreetMap Nominatim (ücretsiz, anahtarsız). Kullanım
 *   politikası gereği User-Agent gönderilir ve sonuçlar cache'lenir.
 * - Yakın çevre: Overpass API ile lat/lng çevresindeki POI'ler bulunur,
 *   kuş uçuşu mesafe (haversine) + tahmini dakika (kmToMinutes) hesaplanır.
 */

const UA = 'IstBaku/1.0 (+https://istbaku.com)';
const ONE_DAY = 60 * 60 * 24;

export interface GeocodeHit {
  lat: number;
  lng: number;
  displayName: string;
}

/** Serbest metin adresi koordinata çevirir. Bulunamazsa null. */
export async function geocodeAddress(query: string): Promise<GeocodeHit | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, next: { revalidate: ONE_DAY } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data.length) return null;
    const hit = data[0];
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, displayName: hit.display_name };
  } catch {
    return null;
  }
}

export type NearbyKey = 'metro' | 'okul' | 'hastane' | 'avm' | 'park' | 'eczane' | 'market' | 'eglence';

export interface NearbyEntry {
  name: string;
  km: number;
  minutes: number;
}

// Her kategori için Overpass etiket filtreleri.
const POI_FILTERS: Record<NearbyKey, string[]> = {
  metro: ['[railway=station]', '[station=subway]', '[railway=subway_entrance]'],
  okul: ['[amenity=school]'],
  hastane: ['[amenity=hospital]'],
  avm: ['[shop=mall]'],
  park: ['[leisure=park]'],
  eczane: ['[amenity=pharmacy]'],
  market: ['[shop=supermarket]'],
  eglence: ['[amenity=restaurant]', '[amenity=cafe]'],
};

interface OverpassEl {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * lat/lng çevresinde her kategori için EN YAKIN POI'yi bulur ve mesafe/süre
 * hesaplar. Overpass erişilemezse boş döner (kısmi sonuç da olabilir).
 */
export async function fetchNearbyPOIs(
  origin: LatLng,
  radiusM = 4000,
): Promise<Partial<Record<NearbyKey, NearbyEntry>>> {
  if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) return {};

  // Tek Overpass sorgusunda tüm kategorileri çek.
  const blocks: string[] = [];
  for (const filters of Object.values(POI_FILTERS)) {
    for (const f of filters) {
      blocks.push(`node(around:${radiusM},${origin.lat},${origin.lng})${f};`);
      blocks.push(`way(around:${radiusM},${origin.lat},${origin.lng})${f};`);
    }
  }
  const query = `[out:json][timeout:25];(${blocks.join('')});out center tags;`;

  let elements: OverpassEl[] = [];
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: ONE_DAY },
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { elements?: OverpassEl[] };
    elements = data.elements ?? [];
  } catch {
    return {};
  }

  // Bir POI hangi kategoriye girer? (etiketlerine bakarak)
  function categoryOf(tags: Record<string, string>): NearbyKey | null {
    if (tags.railway === 'station' || tags.station === 'subway' || tags.railway === 'subway_entrance') return 'metro';
    if (tags.amenity === 'school') return 'okul';
    if (tags.amenity === 'hospital') return 'hastane';
    if (tags.shop === 'mall') return 'avm';
    if (tags.leisure === 'park') return 'park';
    if (tags.amenity === 'pharmacy') return 'eczane';
    if (tags.shop === 'supermarket') return 'market';
    if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') return 'eglence';
    return null;
  }

  const best: Partial<Record<NearbyKey, NearbyEntry>> = {};
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const tags = el.tags;
    if (lat == null || lng == null || !tags) continue;
    const cat = categoryOf(tags);
    if (!cat) continue;
    const km = haversineKm(origin, { lat, lng });
    const existing = best[cat];
    if (!existing || km < existing.km) {
      best[cat] = {
        name: tags.name?.trim() || defaultName(cat),
        km: Math.round(km * 10) / 10,
        minutes: kmToMinutes(km, km > 1.5 ? 'drive' : 'walk'),
      };
    }
  }
  return best;
}

function defaultName(cat: NearbyKey): string {
  const map: Record<NearbyKey, string> = {
    metro: 'Metro/İstasyon', okul: 'Okul', hastane: 'Hastane', avm: 'AVM',
    park: 'Park', eczane: 'Eczane', market: 'Market', eglence: 'Restoran/Kafe',
  };
  return map[cat];
}
