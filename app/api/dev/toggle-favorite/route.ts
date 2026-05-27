import { NextResponse } from 'next/server';
import { toggleFavoriteAction } from '@/lib/favorite-actions';
import { guardDevRoute } from '../_guard';
import { getCurrentUser } from '@/lib/auth-actions';

export async function POST(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { listingId } = await req.json();
  const r = await toggleFavoriteAction(listingId);
  return NextResponse.json(r);
}
