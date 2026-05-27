import { NextResponse } from 'next/server';
import { forgotPasswordAction } from '@/lib/auth-actions';
import { guardDevRoute } from '../_guard';

export async function POST(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;
  const { email } = await req.json();
  const r = await forgotPasswordAction(email);
  return NextResponse.json(r);
}
