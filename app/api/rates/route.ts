import { NextResponse } from 'next/server';
import { fetchRates } from '@/lib/rates';

// Canlı döviz kurları. Next fetch cache'i sayesinde dış API günde birkaç kez
// çağrılır; istemci bu uçtan güncel kurları alır.
export const revalidate = 21600; // 6 saat

export async function GET() {
  const payload = await fetchRates();
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
  });
}
