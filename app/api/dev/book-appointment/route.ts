import { NextResponse } from 'next/server';
import { createAppointmentAction } from '@/lib/appointment-actions';
import { getCurrentUser } from '@/lib/auth-actions';
import { guardDevRoute } from '../_guard';

// PB-01 fix: dev-only endpoint. Requires the dev-route guard, an authenticated
// session, and forwards to the audited Server Action (atomic insert + unique
// index on (agentId, scheduledAt) handles slot races).
export async function POST(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;

  // PB-01: explicit 401 when no session — avoids returning 200 on anonymous
  // races. The downstream action also enforces this, but surfacing the proper
  // HTTP status here lets clients (and Playwright's persona-7 race probe) see
  // the auth failure unambiguously.
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ ok: false, error: 'Randevu için giriş yapmalısın.' }, { status: 401 });
  }

  const input = await req.json();
  const r = await createAppointmentAction(input);
  // Slot-race losers come back as { ok:false, error:'Bu saat dolu...' } — map
  // to 409 Conflict so race telemetry is visible in HTTP status codes too.
  if (!r.ok) {
    const status = r.error?.includes('dolu') ? 409 : 400;
    return NextResponse.json(r, { status });
  }
  return NextResponse.json(r);
}
