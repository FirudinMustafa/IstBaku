'use server';

import { db } from '@/db/client';
import { blogPosts } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getCurrentUser, getCurrentAdmin } from './auth-actions';
import { revalidatePath } from 'next/cache';
import { slugify } from './utils';
import { sanitizeText } from './sanitize';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface BlogPostInput {
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category: 'news' | 'market' | 'guide' | 'partner';
  tags: string[];
  language: string;
  published: boolean;
}

/* ------------------------------------------------------------------ */
/* Role helpers                                                        */
/* ------------------------------------------------------------------ */

const WRITE_ROLES = new Set(['admin', 'moderator', 'super_admin', 'blog_publisher']);
const DELETE_ROLES = new Set(['admin', 'super_admin']);

async function getAnyUser(): Promise<{ id: string; name: string; email: string; role: string } | null> {
  const admin = await getCurrentAdmin();
  if (admin) return admin;
  const user = await getCurrentUser();
  if (user) return { id: user.id, name: user.name, email: user.email, role: user.role };
  return null;
}

/* ------------------------------------------------------------------ */
/* Server actions (mutating)                                           */
/* ------------------------------------------------------------------ */

export async function createBlogPostAction(
  input: BlogPostInput,
): Promise<{ ok: true; id: string; slug: string } | { ok: false; error: string }> {
  const user = await getAnyUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  if (!WRITE_ROLES.has(user.role)) return { ok: false, error: 'Yetkin yok.' };

  const safeTitle = sanitizeText(input.title, { maxLength: 300 });
  if (!safeTitle) return { ok: false, error: 'Başlık gerekli.' };
  const safeExcerpt = sanitizeText(input.excerpt, { maxLength: 1_000 }) ?? '';
  const safeContent = sanitizeText(input.content, { maxLength: 50_000 });
  if (!safeContent) return { ok: false, error: 'İçerik gerekli.' };

  try {
    const base = slugify(safeTitle);
    let slug = base;
    let suffix = 1;
    while (
      (
        await db
          .select({ id: blogPosts.id })
          .from(blogPosts)
          .where(eq(blogPosts.slug, slug))
          .limit(1)
      ).length > 0
    ) {
      slug = `${base}-${suffix++}`;
    }

    const now = new Date();
    const isPublisher = user.role === 'blog_publisher';
    const canPublish = !isPublisher;
    const published = canPublish ? input.published : false;
    const [created] = await db
      .insert(blogPosts)
      .values({
        slug,
        title: safeTitle,
        excerpt: safeExcerpt,
        content: safeContent,
        coverImage: input.coverImage ?? null,
        authorId: user.id,
        authorName: user.name,
        category: input.category,
        tags: input.tags,
        language: input.language || 'tr',
        published,
        publishedAt: published ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    revalidatePath('/blog');
    revalidatePath('/');

    return { ok: true, id: created.id, slug: created.slug };
  } catch (err) {
    console.error('createBlogPost error', err);
    return { ok: false, error: 'Blog yazısı oluşturulamadı.' };
  }
}

export async function updateBlogPostAction(
  id: string,
  input: BlogPostInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAnyUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  if (!WRITE_ROLES.has(user.role)) return { ok: false, error: 'Yetkin yok.' };

  const safeTitle = sanitizeText(input.title, { maxLength: 300 });
  if (!safeTitle) return { ok: false, error: 'Başlık gerekli.' };
  const safeExcerpt = sanitizeText(input.excerpt, { maxLength: 1_000 }) ?? '';
  const safeContent = sanitizeText(input.content, { maxLength: 50_000 });
  if (!safeContent) return { ok: false, error: 'İçerik gerekli.' };

  try {
    const [existing] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);
    if (!existing) return { ok: false, error: 'Yazı bulunamadı.' };

    if (user.role === 'blog_publisher' && existing.authorId !== user.id)
      return { ok: false, error: 'Yalnızca kendi yazılarınızı düzenleyebilirsiniz.' };

    const now = new Date();
    const isPublisher = user.role === 'blog_publisher';
    const canPublish = !isPublisher;
    const finalPublished = canPublish ? input.published : existing.published;
    const publishedAt =
      finalPublished && !existing.published ? now : existing.publishedAt;

    await db
      .update(blogPosts)
      .set({
        title: safeTitle,
        excerpt: safeExcerpt,
        content: safeContent,
        coverImage: input.coverImage ?? null,
        category: input.category,
        tags: input.tags,
        language: input.language || 'tr',
        published: finalPublished,
        publishedAt,
        updatedAt: now,
      })
      .where(eq(blogPosts.id, id));

    revalidatePath('/blog');
    revalidatePath(`/blog/${existing.slug}`);
    revalidatePath('/');

    return { ok: true };
  } catch (err) {
    console.error('updateBlogPost error', err);
    return { ok: false, error: 'Güncellenemedi.' };
  }
}

export async function deleteBlogPostAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAnyUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  if (!DELETE_ROLES.has(user.role))
    return { ok: false, error: 'Yalnızca admin silebilir.' };

  try {
    const [existing] = await db
      .select({ slug: blogPosts.slug })
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);
    if (!existing) return { ok: false, error: 'Yazı bulunamadı.' };

    await db.delete(blogPosts).where(eq(blogPosts.id, id));

    revalidatePath('/blog');
    revalidatePath(`/blog/${existing.slug}`);
    revalidatePath('/');

    return { ok: true };
  } catch (err) {
    console.error('deleteBlogPost error', err);
    return { ok: false, error: 'Silinemedi.' };
  }
}

/* ------------------------------------------------------------------ */
/* Public queries (not server actions -- for server components)        */
/* ------------------------------------------------------------------ */

export async function getPublishedBlogPosts(opts?: {
  limit?: number;
  category?: 'news' | 'market' | 'guide' | 'partner';
}) {
  const { limit = 20, category } = opts ?? {};
  const conditions = [eq(blogPosts.published, true)];
  if (category) conditions.push(eq(blogPosts.category, category));
  return db
    .select()
    .from(blogPosts)
    .where(and(...conditions))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit);
}

export async function getBlogPostBySlug(slug: string) {
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.published, true)))
    .limit(1);
  return post ?? null;
}

/* ------------------------------------------------------------------ */
/* Admin query (all posts including unpublished)                       */
/* ------------------------------------------------------------------ */

export async function getAllBlogPosts() {
  const user = await getAnyUser();
  if (!user || !WRITE_ROLES.has(user.role)) return [];

  if (user.role === 'blog_publisher') {
    return db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.authorId, user.id))
      .orderBy(desc(blogPosts.createdAt));
  }

  return db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.createdAt));
}
