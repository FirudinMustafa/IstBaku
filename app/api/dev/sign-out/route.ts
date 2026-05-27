import { NextResponse } from 'next/server';
import { signOutAction } from '@/lib/auth-actions';
import { guardDevRoute } from '../_guard';

export async function POST(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;
  await signOutAction();
  return NextResponse.json({ ok: true });
}
