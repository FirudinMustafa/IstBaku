import { NextResponse } from 'next/server';
import { aiMatch } from '@/lib/mock-ai';
import { getCurrentUser } from '@/lib/auth-actions';
import type { UserGoal, Country } from '@/lib/types';

interface MatchBody {
  goals?: UserGoal[];
  countries?: Country[];
  maxBudgetUSD?: number;
  horizonYears?: number;
  max?: number;
  maxResults?: number;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as MatchBody;
  const goals = body.goals ?? ['yatirim'];
  const countries = body.countries ?? ['TR', 'AZ'];
  const results = await aiMatch({
    goals,
    countries,
    maxBudgetUSD: body.maxBudgetUSD,
    horizonYears: body.horizonYears,
    maxResults: body.maxResults ?? body.max ?? 5,
  });
  return NextResponse.json({ results });
}
