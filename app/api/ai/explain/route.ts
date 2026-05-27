import { NextResponse } from 'next/server';
import { aiExplainScore } from '@/lib/mock-ai';
import { getListingById, getListingBySlug } from '@/lib/db-queries';
import { getCurrentUser } from '@/lib/auth-actions';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { propertyId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const id = body?.propertyId;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'missing_propertyId' }, { status: 404 });
  }
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const p = isUuid ? await getListingById(id) : await getListingBySlug(id);
  if (!p) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const explanation = await aiExplainScore(p);
  return NextResponse.json({ explanation });
}
