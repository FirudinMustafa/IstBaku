import { NextResponse } from 'next/server';
import { getListingById, getListingBySlug } from '@/lib/db-queries';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // UUID veya slug ile destekle
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const p = isUuid ? await getListingById(id) : await getListingBySlug(id);
  if (!p) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(p);
}
