import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, User, Tag, Newspaper } from 'lucide-react';
import { getBlogPostBySlug, getPublishedBlogPosts } from '@/lib/blog-actions';
import { sanitizeHtml } from '@/lib/sanitize';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';

export const revalidate = 3600; // ISR 1 hour

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
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Yazi Bulunamadi' };

  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: 'article',
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  // Fetch related posts (same category, excluding current)
  const allPosts = await getPublishedBlogPosts({ limit: 10, category: post.category });
  const relatedPosts = allPosts.filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <main className="min-h-screen">
      {/* Cover image */}
      <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[480px]">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy-700 via-navy-800 to-navy-950" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--bg)] via-[color:var(--bg)]/60 to-transparent" />

        {/* Back button */}
        <div className="absolute top-20 sm:top-24 left-2 sm:left-3 lg:left-5 z-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-[color:var(--fg-muted)] hover:text-gold-300 transition-colors bg-[color:var(--bg)]/60 backdrop-blur-sm rounded-full px-3 py-1.5"
          >
            <ArrowLeft size={14} /> Blog
          </Link>
        </div>
      </div>

      {/* Article content */}
      <article className="w-full px-2 sm:px-3 lg:px-5 -mt-20 sm:-mt-28 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Meta header */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <Badge variant={CATEGORY_VARIANTS[post.category] ?? 'navy'}>
              {CATEGORY_LABELS[post.category] ?? post.category}
            </Badge>
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                <Tag size={9} /> {tag}
              </Badge>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            {post.title}
          </h1>

          {/* Author & date */}
          <div className="mt-4 flex items-center gap-4 text-sm text-[color:var(--fg-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <User size={14} /> {post.authorName}
            </span>
            {post.publishedAt && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} /> {formatDate(post.publishedAt)}
              </span>
            )}
          </div>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="mt-6 text-lg text-[color:var(--fg-muted)] leading-relaxed border-l-2 border-gold-400/40 pl-4">
              {post.excerpt}
            </p>
          )}

          {/* Content */}
          <div
            className="mt-8 prose prose-invert prose-gold max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:leading-relaxed prose-p:text-[color:var(--fg-muted)]
              prose-a:text-gold-300 prose-a:no-underline hover:prose-a:text-gold-400
              prose-strong:text-[color:var(--fg)]
              prose-img:rounded-2xl prose-img:shadow-lg
              prose-blockquote:border-gold-400/40 prose-blockquote:text-[color:var(--fg-muted)]
              prose-code:text-gold-300 prose-code:bg-[color:var(--bg-elev)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-li:text-[color:var(--fg-muted)]"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content, { maxLength: 50_000 }) }}
          />
        </div>
      </article>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="w-full px-2 sm:px-3 lg:px-5 py-12 sm:py-16 mt-8 border-t border-[color:var(--border)]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight mb-8 text-center">
              Diger Yazilar
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedPosts.map((rp) => (
                <Link key={rp.id} href={`/blog/${rp.slug}`} className="group">
                  <Card glass className="h-full overflow-hidden transition-all duration-300 hover:border-gold-400/40 hover:shadow-lg hover:shadow-gold-400/5">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {rp.coverImage ? (
                        <Image
                          src={rp.coverImage}
                          alt={rp.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-navy-600 via-navy-700 to-navy-900 flex items-center justify-center">
                          <Newspaper size={32} className="text-gold-400/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge
                          variant={CATEGORY_VARIANTS[rp.category] ?? 'navy'}
                          className="backdrop-blur-sm"
                        >
                          {CATEGORY_LABELS[rp.category] ?? rp.category}
                        </Badge>
                      </div>
                    </div>
                    <CardBody className="p-4 flex flex-col gap-2">
                      <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-gold-300 transition-colors">
                        {rp.title}
                      </h3>
                      <div className="mt-auto flex items-center gap-2 text-xs text-[color:var(--fg-faint)] pt-2 border-t border-[color:var(--border)]">
                        {rp.publishedAt && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={10} />
                            {formatDate(rp.publishedAt)}
                          </span>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
