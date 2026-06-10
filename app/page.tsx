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
      {/* Tur6 #4g: döviz ↔ blog yer değişimi — blog hero altına geldi. */}
      <div className="relative z-10 pt-6 sm:pt-8">
        <BlogNews posts={blogPosts} />
      </div>
      {/* Hero sonrası bölümler için ince marka renk dokusu — büyük, bulanık
          tan/navy lekeleri + çok hafif grid dokusu (boş zemini canlandırır). */}
      <div className="relative">
        {/* Ucuz (blur'suz) marka renk katmanı — HER ekranda görünür (mobil dahil),
            compositing maliyeti yok. Boş zemine renk/derinlik katar (Madde 13). */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(202,174,153,0.13) 0%, transparent 20%, transparent 58%, rgba(138,160,190,0.11) 100%)' }}
          />
          <div className="absolute inset-0 grid-bg opacity-[0.08]" />
        </div>
        {/* Perf (Madde 14): ağır blur-3xl lekeler yalnızca md+ — mobilde kasma azalır. */}
        <div aria-hidden className="hidden md:block pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute top-[4%] -left-40 w-[560px] h-[560px] rounded-full opacity-[0.24]"
            style={{ background: 'radial-gradient(circle, #CAAE99 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-[28%] -right-48 w-[640px] h-[640px] rounded-full opacity-[0.18]"
            style={{ background: 'radial-gradient(circle, #121F30 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-[56%] left-[20%] w-[480px] h-[480px] rounded-full opacity-[0.22]"
            style={{ background: 'radial-gradient(circle, #CAAE99 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-[78%] -left-32 w-[420px] h-[420px] rounded-full opacity-[0.16]"
            style={{ background: 'radial-gradient(circle, #8AA0BE 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-[4%] -right-24 w-[460px] h-[460px] rounded-full opacity-[0.18]"
            style={{ background: 'radial-gradient(circle, #8AA0BE 0%, transparent 70%)' }}
          />
        </div>
        <div className="relative z-10">
          <FeatureBento />
          <FeaturedListings />
          <PremiumListings listings={premiumListings} />
          <Calculators />
          <CountryGuides initial={guides} />
          <CurrencyConverter />
        </div>
      </div>
      <CTA />
    </>
  );
}
