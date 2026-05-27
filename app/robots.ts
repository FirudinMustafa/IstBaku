import type { MetadataRoute } from 'next';

// MH-22 — robots policy. Public surfaces are crawlable; user/admin/internal
// surfaces are disallowed and the sitemap is advertised.

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  'https://istbaku.com'
).replace(/\/+$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/agent',
          '/agent/',
          '/dashboard',
          '/dashboard/',
          '/private-portfolio',
          '/private-portfolio/',
          '/messages',
          '/messages/',
          '/new-listing',
          '/auth/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
