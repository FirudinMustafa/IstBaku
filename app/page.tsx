import { Hero } from '@/components/home/Hero';
import { CurrencyConverter } from '@/components/home/CurrencyConverter';
import { FeatureBento } from '@/components/home/FeatureBento';
import { FeaturedListings } from '@/components/home/FeaturedListings';
import { Calculators } from '@/components/home/Calculators';
import { CountryGuides } from '@/components/home/CountryGuides';
import { PremiumListings } from '@/components/home/PremiumListings';
import { CTA } from '@/components/home/CTA';
import { BlogNews } from '@/components/home/BlogNews';
import { getAllCountryGuides } from '@/lib/admin-queries';
import { getPremiumListings } from '@/lib/db-queries';
import { getPublishedBlogPosts } from '@/lib/blog-actions';
import { DEFAULT_GUIDES, type CountryGuide } from '@/lib/data/country-guides';

// MH-19 — marketing home is publishable; ISR with 1h revalidate.
export const revalidate = 3600;

export default async function HomePage() {
  let guides: CountryGuide[] = DEFAULT_GUIDES;
  let premiumListings: Awaited<ReturnType<typeof getPremiumListings>> = [];
  let blogPosts: { id: string; slug: string; title: string; excerpt: string; coverImage: string | null; category: string; authorName: string; publishedAt: string | null }[] = [];
  try {
    const [rows, premium, rawBlog] = await Promise.all([
      getAllCountryGuides(),
      getPremiumListings({ limit: 4 }),
      getPublishedBlogPosts({ limit: 3 }),
    ]);
    premiumListings = premium;
    blogPosts = rawBlog.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      coverImage: p.coverImage,
      category: p.category,
      authorName: p.authorName,
      publishedAt: p.publishedAt?.toISOString() ?? null,
    }));
    if (rows.length > 0) {
      guides = rows.map((r) => ({
        iso: r.iso,
        name: r.name,
        flag: r.flag,
        description: r.description,
        pdfUrl: r.pdfUrl,
        pages: r.pages,
        language: r.language as CountryGuide['language'],
        updatedAt: r.updatedAt.toISOString().slice(0, 10),
      }));
    }
  } catch (err) {
    console.error('home page queries failed', err);
  }

  return (
    <>
      <Hero />
      <div className="-mt-8 sm:-mt-12 relative z-10">
        <CurrencyConverter />
      </div>
      <FeatureBento />
      <FeaturedListings />
      <PremiumListings listings={premiumListings} />
      <Calculators />
      <CountryGuides initial={guides} />
      <BlogNews posts={blogPosts} />
      <CTA />
    </>
  );
}
