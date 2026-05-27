import { BlogClient } from './BlogClient';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  const { getAllBlogPosts } = await import('@/lib/blog-actions');
  const posts = await getAllBlogPosts();
  return (
    <BlogClient
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
