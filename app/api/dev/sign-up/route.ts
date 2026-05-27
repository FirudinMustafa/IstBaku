import { NextResponse } from 'next/server';
import { signUpAction } from '@/lib/auth-actions';
import { guardDevRoute } from '../_guard';

export async function POST(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;
  const input = await req.json();
  const r = await signUpAction(input);
  return NextResponse.json(r);
}
