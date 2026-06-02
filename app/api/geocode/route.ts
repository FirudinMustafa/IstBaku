import { NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';
import { getCurrentUser } from '@/lib/auth-actions';

// Adresten koordinat bulma (ilan sihirbazı). Oturum gerektirir (kötüye kullanımı sınırlar).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Yetkisiz.' }, { status: 401 });

  const q = new URL(req.url).searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json({ ok: false, error: 'q gerekli.' }, { status: 400 });

  const hit = await geocodeAddress(q);
  if (!hit) return NextResponse.json({ ok: false, error: 'Adres bulunamadı.' }, { status: 404 });
  return NextResponse.json({ ok: true, ...hit });
}
