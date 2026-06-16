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
const LANG_COOKIE = 'istbaku-lang';

// Bakım modu (maintenance). MAINTENANCE_MODE=1 iken site dışarıya kapalı; herkes
// 503 + bakım ekranı görür. Sahip önizleme yapabilsin diye ?preview=<gizli kod>
// ile gelince MAINTENANCE_BYPASS değerine eşit çerez set edilir ve site normal
// görünür. Env kapalıyken (veya tanımsızken) bu blok hiçbir şey yapmaz.
const BYPASS_COOKIE = 'istbaku-bypass';

function maintenanceResponse(): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Bakım çalışması — IstBaku</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #0f172a; color: #e2e8f0; text-align: center; padding: 24px; }
  .card { max-width: 480px; }
  h1 { font-size: 1.6rem; margin: 0 0 12px; }
  p { margin: 6px 0; color: #94a3b8; line-height: 1.6; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%;
    background: #f59e0b; margin-right: 8px; vertical-align: middle; }
</style>
</head>
<body>
  <div class="card">
    <h1><span class="dot"></span>Bakım çalışması</h1>
    <p>Sitemiz şu anda kısa süreli bakımda. Çok yakında tekrar yayında olacağız.</p>
    <p>Saytımız hazırda texniki işlərdədir. Tezliklə yenidən aktiv olacaq.</p>
    <p>We'll be back shortly. The site is temporarily down for maintenance.</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 503,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'retry-after': '3600',
      'cache-control': 'no-store',
    },
  });
}

// Ülke → dil eşlemesi (Madde 1). AZ→az, TR→tr, geri kalan→en.
function langForCountry(country: string | null | undefined): 'tr' | 'az' | 'en' {
  const c = (country ?? '').toUpperCase();
  if (c === 'AZ') return 'az';
  if (c === 'TR') return 'tr';
  return 'en';
}

function isProtected(pathname: string): boolean {
  if (PROTECTED_EXCEPTIONS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bakım modu gate. Env açıkken herkesi 503 bakım ekranına düşür; bypass
  // çerezi/önizleme kodu olanlar normal devam eder.
  if (process.env.MAINTENANCE_MODE === '1') {
    const bypass = process.env.MAINTENANCE_BYPASS;
    const preview = req.nextUrl.searchParams.get('preview');

    // ?preview=<kod> ile gelindiyse bypass çerezini set edip temiz URL'e yönlendir.
    if (bypass && preview && preview === bypass) {
      const clean = req.nextUrl.clone();
      clean.searchParams.delete('preview');
      const res = NextResponse.redirect(clean);
      res.cookies.set(BYPASS_COOKIE, bypass, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
        httpOnly: true,
      });
      return res;
    }

    const hasBypass = !!bypass && req.cookies.get(BYPASS_COOKIE)?.value === bypass;
    if (!hasBypass) {
      return maintenanceResponse();
    }
  }

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

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // Madde 1: ilk ziyarette ülkeye göre dil cookie'si set et (kullanıcı henüz
  // seçmediyse). Vercel `x-vercel-ip-country` header'ını sağlar. Kullanıcı dili
  // değiştirdiğinde LangProvider cookie'yi günceller; burada üzerine yazmayız.
  if (!req.cookies.get(LANG_COOKIE)) {
    const country = req.headers.get('x-vercel-ip-country');
    res.cookies.set(LANG_COOKIE, langForCountry(country), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
