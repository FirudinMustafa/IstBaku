import type { MetadataRoute } from 'next';
import { getPublicListings } from '@/lib/db-queries';

// MH-22 — public sitemap. Indexable static routes + approved public listings.
// Hidden surfaces (admin, agent, dashboard, messages, private-portfolio,
// new-listing, auth) are intentionally excluded; robots.ts disallows them.

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  'https://istbaku.com'
).replace(/\/+$/, '');

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: '/', changeFrequency: 'daily', priority: 1 },
  { url: '/listings', changeFrequency: 'hourly', priority: 0.9 },
  { url: '/ai-match', changeFrequency: 'weekly', priority: 0.7 },
  { url: '/compare', changeFrequency: 'weekly', priority: 0.5 },
  { url: '/legal-guide', changeFrequency: 'monthly', priority: 0.6 },
  { url: '/reports', changeFrequency: 'weekly', priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  let listingEntries: MetadataRoute.Sitemap = [];
  try {
    const listings = await getPublicListings();
    listingEntries = listings.map((p) => ({
      url: `${SITE_URL}/property/${p.slug}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (err) {
    console.error('sitemap: getPublicListings failed', err);
  }

  return [
    ...STATIC_ROUTES.map((r) => ({
      ...r,
      url: `${SITE_URL}${r.url}`,
      lastModified: now,
    })),
    ...listingEntries,
  ];
}
