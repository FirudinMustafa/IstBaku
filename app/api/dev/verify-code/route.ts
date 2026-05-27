import { NextResponse } from 'next/server';
import { verifyCodeAction } from '@/lib/auth-actions';
import { guardDevRoute } from '../_guard';

export async function POST(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;
  const { email, code } = await req.json();
  const r = await verifyCodeAction(email, code);
  return NextResponse.json(r);
}
