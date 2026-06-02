import { NextResponse } from 'next/server';
import { fetchNearbyPOIs } from '@/lib/geocode';
import { getCurrentUser } from '@/lib/auth-actions';

// lat/lng çevresindeki POI'lerin otomatik mesafe hesabı (ilan sihirbazı).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Yetkisiz.' }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const lat = parseFloat(sp.get('lat') ?? '');
  const lng = parseFloat(sp.get('lng') ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: 'Geçerli lat/lng gerekli.' }, { status: 400 });
  }

  const nearby = await fetchNearbyPOIs({ lat, lng });
  return NextResponse.json({ ok: true, nearby });
}
