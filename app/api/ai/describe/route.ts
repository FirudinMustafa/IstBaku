import { NextResponse } from 'next/server';
import { aiDescribe } from '@/lib/mock-ai';
import { getCurrentUser } from '@/lib/auth-actions';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { text } = await req.json();
  const res = await aiDescribe(text ?? '');
  return NextResponse.json(res);
}
