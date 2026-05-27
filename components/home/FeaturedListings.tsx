import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ListingCard } from '@/components/listings/ListingCard';
import { getPublicListings } from '@/lib/db-queries';

export async function FeaturedListings() {
  let featured: Awaited<ReturnType<typeof getPublicListings>> = [];
  try {
    // MC-21 — only fetch what we render; no need to pull the whole catalog.
    featured = await getPublicListings({ limit: 6 });
  } catch {
    featured = [];
  }

  if (featured.length === 0) {
    return (
      <section className="w-full px-4 py-6 sm:py-10">
        <div className="text-center text-[color:var(--fg-muted)]">
          Henüz ilan yok. <Link href="/new-listing" className="text-gold-300 hover:text-gold-400">İlk ilanı sen ver →</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full px-4 py-6 sm:py-10">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">Editörün seçtikleri</h2>
          <p className="mt-2 text-[color:var(--fg-muted)]">AI skoru yüksek, doğrulanmış ilanlar.</p>
        </div>
        <Link href="/listings" className="inline-flex items-center gap-1.5 text-sm text-gold-300 hover:text-gold-400">
          Tümünü gör <ArrowRight size={14} />
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
