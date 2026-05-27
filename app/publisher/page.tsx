import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-actions';
import { getAllBlogPosts } from '@/lib/blog-actions';
import { PublisherBlogClient } from './PublisherBlogClient';

export const dynamic = 'force-dynamic';

export default async function PublisherPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'blog_publisher') redirect('/auth/sign-in');

  const posts = await getAllBlogPosts();
  return (
    <PublisherBlogClient
      initial={posts.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        coverImage: p.coverImage,
        authorName: p.authorName,
        category: p.category,
        tags: p.tags as string[],
        language: p.language,
        published: p.published,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))}
    />
  );
}
