import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-actions';

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user }, { headers: { 'cache-control': 'no-store' } });
}
