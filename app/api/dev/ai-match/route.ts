import { NextResponse } from 'next/server';
import { aiMatchAction } from '@/lib/ai-match-action';
import { guardDevRoute } from '../_guard';
import { rateLimit, LIMITS } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;

  // MC-05: AI endpoints 20/min per IP.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const rl = rateLimit(`ai:match:${ip}`, LIMITS.ai.limit, LIMITS.ai.windowMs);
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'Rate limit' }, { status: 429 });

  const input = await req.json();
  const r = await aiMatchAction(input);
  return NextResponse.json(r);
}
