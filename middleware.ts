import { NextResponse, type NextRequest } from 'next/server';

// MC-03: protected route prefixes. Anything matching one of these MUST have a
// session cookie before the request is allowed through. Role-specific gates
// (admin vs agent vs user) stay in actions / page-level checks — middleware
// only enforces "any authenticated session present".
const PROTECTED_PREFIXES = [
  '/admin',
  '/agent',
  '/dashboard',
  '/messages',
  '/new-listing',
  '/private-portfolio',
  '/publisher',
  '/kyc',
];

// Admin login screen lives under /admin but must remain reachable to bootstrap
// the session. Same logic for explicit "no-auth" admin sub-routes.
const PROTECTED_EXCEPTIONS = [
  '/admin/login',
];

const SESSION_COOKIE = 'istbaku-session';

function isProtected(pathname: string): boolean {
  if (PROTECTED_EXCEPTIONS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pathname'i request header'a ekle ki server component'lar usePathname olmadan okuyabilsin
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  // MC-03 auth gate
  if (isProtected(pathname)) {
    const hasSession = req.cookies.get(SESSION_COOKIE);
    if (!hasSession) {
      const isAdminArea = pathname.startsWith('/admin');
      const target = isAdminArea ? '/admin/login' : '/auth/sign-in';
      const url = req.nextUrl.clone();
      url.pathname = target;
      // Preserve where the user was going for post-login redirect.
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
