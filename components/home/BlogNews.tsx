'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Newspaper, ArrowRight, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  category: string;
  authorName: string;
  publishedAt: string | null;
}

interface Props {
  posts: BlogPost[];
}

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

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function BlogNews({ posts }: Props) {
  if (posts.length === 0) return null;

  return (
    <section className="w-full px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="navy"><Newspaper size={11} /> Blog &amp; Haberler</Badge>
        <h2 className="font-display mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-balance">
          Emlak Dunyasindan Guncel
        </h2>
        <p className="mt-3 text-[color:var(--fg-muted)] text-pretty">
          Piyasa analizleri, yatirim rehberleri ve sektordeki son gelismeler.
        </p>
      </div>

      {/* Grid */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group">
            <Card glass className="h-full overflow-hidden transition-all duration-300 hover:border-gold-400/40 hover:shadow-lg hover:shadow-gold-400/5">
              {/* Cover image */}
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
                {/* Category badge overlay */}
                <div className="absolute top-3 left-3">
                  <Badge variant={CATEGORY_VARIANTS[post.category] ?? 'navy'} className="backdrop-blur-sm">
                    {CATEGORY_LABELS[post.category] ?? post.category}
                  </Badge>
                </div>
              </div>

              <CardBody className="p-4 sm:p-5 flex flex-col gap-3">
                {/* Title */}
                <h3 className="text-base sm:text-lg font-semibold leading-snug line-clamp-2 group-hover:text-gold-300 transition-colors">
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="text-sm text-[color:var(--fg-muted)] line-clamp-2 leading-relaxed">
                  {post.excerpt}
                </p>

                {/* Meta row */}
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

      {/* View all link */}
      <div className="mt-8 text-center">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-300 hover:text-gold-400 transition-colors"
        >
          Tumunu Gor <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
