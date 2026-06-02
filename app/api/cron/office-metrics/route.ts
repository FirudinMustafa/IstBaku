import { NextResponse } from 'next/server';
import { recomputeOfficeMetricsAction } from '@/lib/office-actions';

// Aylık ofis performans metriklerini yeniden hesaplayan cron ucu.
// Vercel Cron veya harici zamanlayıcı çağırır. CRON_SECRET ile korunur.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Yetkisiz.' }, { status: 401 });
  }
  const res = await recomputeOfficeMetricsAction({ adminBypass: true });
  return NextResponse.json(res);
}
