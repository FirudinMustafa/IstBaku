import { NextResponse } from 'next/server';

/**
 * MC-04 + MH-01: dev-only endpoint guard.
 *
 *   - Requires `NODE_ENV === 'development'` AND `ENABLE_DEV_ROUTES=true`.
 *     Any other environment → 404.
 *   - Same-origin check (Origin/Referer must match the host) to defeat
 *     drive-by CSRF from third-party sites.
 *
 * Returns a `NextResponse` to bail out, or `null` if the request is allowed.
 */
export function guardDevRoute(req: Request): NextResponse | null {
  if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEV_ROUTES !== 'true') {
    return new NextResponse('Not found', { status: 404 });
  }

  // CSRF / origin check (defence-in-depth: dev cookie is SameSite=lax already).
  const origin = req.headers.get('origin') ?? '';
  const referer = req.headers.get('referer') ?? '';
  const host = req.headers.get('host') ?? '';
  if (origin || referer) {
    const okOrigin = origin && safeHost(origin) === host;
    const okReferer = referer && safeHost(referer) === host;
    if (!okOrigin && !okReferer) {
      return new NextResponse('Forbidden (cross-origin)', { status: 403 });
    }
  }
  return null;
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}
