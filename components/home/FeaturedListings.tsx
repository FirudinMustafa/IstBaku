import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ListingCard } from '@/components/listings/ListingCard';
import { getPopularListings } from '@/lib/db-queries';
import { T } from '@/components/i18n/T';

export async function FeaturedListings() {
  let featured: Awaited<ReturnType<typeof getPopularListings>> = [];
  try {
    // En çok görüntülenen ilanlar — popülerliğe göre sıralanır.
    featured = await getPopularListings({ limit: 6 });
  } catch {
    featured = [];
  }

  if (featured.length === 0) {
    return (
      <section className="w-full px-4 py-6 sm:py-10">
        <div className="text-center text-[color:var(--fg-muted)]">
          <T k="home.featured.empty" /> <Link href="/new-listing" className="text-gold-300 hover:text-gold-400"><T k="home.featured.emptyCta" /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full px-4 py-6 sm:py-10">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight"><T k="home.featured.title" /></h2>
          <p className="mt-2 text-[color:var(--fg-muted)]"><T k="home.featured.sub" /></p>
        </div>
        <Link href="/listings" className="inline-flex items-center gap-1.5 text-sm text-gold-300 hover:text-gold-400">
          <T k="home.seeAll" /> <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {featured.map((p) => (
          <ListingCard key={p.id} property={p} />
        ))}
      </div>
    </section>
  );
}
