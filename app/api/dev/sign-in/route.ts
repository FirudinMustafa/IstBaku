import { NextResponse } from 'next/server';
import { signInAction, adminSignInAction } from '@/lib/auth-actions';
import { guardDevRoute } from '../_guard';

// DEV-ONLY: test cookie üreten endpoint. Production'da 404 döner.
export async function POST(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;
  const { email, password, admin } = await req.json();
  if (admin) {
    const r = await adminSignInAction(email, password);
    return NextResponse.json(r);
  }
  const r = await signInAction(email, password);
  return NextResponse.json(r);
}
