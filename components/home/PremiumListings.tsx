'use client';

import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ListingCard } from '@/components/listings/ListingCard';
import type { Property } from '@/lib/types';

interface Props {
  listings: Property[];
}

export function PremiumListings({ listings }: Props) {
  if (listings.length === 0) return null;
  return (
    <section className="w-full px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Badge variant="gold"><ShieldCheck size={11} /> IstBaku Onaylı</Badge>
          <h2 className="font-display mt-2 text-2xl sm:text-3xl font-bold tracking-tight">Onaylı Premium İlanlar</h2>
          <p className="mt-1 text-sm text-[color:var(--fg-muted)]">ISTBAKU tarafından kontrol edilmiş, güvenilir ilanlar.</p>
        </div>
        <Link href="/listings?approved=true">
          <Button variant="outline" size="sm">Tümünü Gör <ArrowRight size={14} /></Button>
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {listings.slice(0, 4).map((p) => (
          <ListingCard key={p.id} property={p} />
        ))}
      </div>
    </section>
  );
}
