import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth-actions';
import { confirmPayment } from '@/lib/payment-confirm';

/**
 * POST /api/payments/mock-confirm
 *
 * Mock payment confirmation endpoint. In production this would be replaced
 * by a real payment provider webhook. Requires an authenticated session.
 */
export async function POST(req: NextRequest) {
  try {
    // Validate session — allow both regular users and admins
    const user = await getCurrentUser();
    const admin = await getCurrentAdmin();
    if (!user && !admin) {
      return NextResponse.json({ ok: false, error: 'Yetkisiz.' }, { status: 401 });
    }

    const body = await req.json() as { paymentId?: string };
    if (!body.paymentId || typeof body.paymentId !== 'string') {
      return NextResponse.json({ ok: false, error: 'paymentId gerekli.' }, { status: 400 });
    }

    const result = await confirmPayment(body.paymentId);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('mock-confirm route error', err);
    return NextResponse.json({ ok: false, error: 'Beklenmedik hata.' }, { status: 500 });
  }
}
