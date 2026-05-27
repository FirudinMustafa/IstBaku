import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Newspaper, Calendar, User } from 'lucide-react';
import { getPublishedBlogPosts } from '@/lib/blog-actions';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';

export const revalidate = 1800; // ISR 30 min

export const metadata: Metadata = {
  title: 'Blog & Haberler',
  description: 'Emlak piyasasi analizleri, yatirim rehberleri ve sektordeki son gelismeler.',
};

const CATEGORIES = [
  { key: undefined, label: 'Tumu' },
  { key: 'news' as const, label: 'Haberler' },
  { key: 'market' as const, label: 'Piyasa' },
  { key: 'guide' as const, label: 'Rehber' },
  { key: 'partner' as const, label: 'Partner' },
];

const CATEGORY_LABELS: Record<string, string> = {
  news: 'Haberler',
  market: 'Piyasa',
  guide: 'Rehber',
  partner: 'Partner',
};

const CATEGORY_VARIANTS: Record<string, 'gold' | 'navy' | 'success' | 'premium'> = {
  news: 'navy',
  market: 'gold',
  guide: 'success',
  partner: 'premium',
};

function formatDate(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function BlogPage({ searchParams }: Props) {
  const params = await searchParams;
  const activeCategory = (['news', 'market', 'guide', 'partner'] as const).find(
    (c) => c === params.category,
  );

  const posts = await getPublishedBlogPosts({
    limit: 50,
    category: activeCategory,
  });

  return (
    <main className="min-h-screen">
      {/* Hero header */}
      <section className="w-full px-2 sm:px-3 lg:px-5 pt-24 pb-10 sm:pt-28 sm:pb-14">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="navy"><Newspaper size={11} /> Blog</Badge>
          <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight">
            Blog &amp; Haberler
          </h1>
          <p className="mt-4 text-[color:var(--fg-muted)] text-lg text-pretty">
            Piyasa analizleri, yatirim rehberleri ve sektordeki son gelismeler.
          </p>
        </div>

        {/* Category tabs */}
        <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => {
            const isActive = cat.key === activeCategory;
            const href = cat.key ? `/blog?category=${cat.key}` : '/blog';
            return (
              <Link
                key={cat.label}
                href={href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gold-400 text-navy-900 shadow-md'
                    : 'bg-[color:var(--bg-elev)] text-[color:var(--fg-muted)] border border-[color:var(--border)] hover:border-gold-400/40 hover:text-gold-300'
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Posts grid */}
      <section className="w-full px-2 sm:px-3 lg:px-5 pb-16">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-[color:var(--fg-muted)]">
            <Newspaper size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">Henuz yayin yok.</p>
            <p className="mt-1 text-sm">Yakinda yeni icerikler eklenecek.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                <Card glass className="h-full overflow-hidden transition-all duration-300 hover:border-gold-400/40 hover:shadow-lg hover:shadow-gold-400/5">
                  {/* Cover */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {post.coverImage ? (
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-navy-600 via-navy-700 to-navy-900 flex items-center justify-center">
                        <Newspaper size={40} className="text-gold-400/30" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge
                        variant={CATEGORY_VARIANTS[post.category] ?? 'navy'}
                        className="backdrop-blur-sm"
                      >
                        {CATEGORY_LABELS[post.category] ?? post.category}
                      </Badge>
                    </div>
                  </div>

                  <CardBody className="p-4 sm:p-5 flex flex-col gap-3">
                    <h2 className="text-base sm:text-lg font-semibold leading-snug line-clamp-2 group-hover:text-gold-300 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-[color:var(--fg-muted)] line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="mt-auto flex items-center gap-3 text-xs text-[color:var(--fg-faint)] pt-2 border-t border-[color:var(--border)]">
                      {post.publishedAt && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(post.publishedAt)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <User size={11} />
                        {post.authorName}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
