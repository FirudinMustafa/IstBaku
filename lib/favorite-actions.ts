'use server';

import { db } from '@/db/client';
import { favorites, favoriteCollections, listings } from '@/db/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { rowToProperty } from './db-mappers';
import { sanitizeText } from './sanitize';
import type { Property } from './types';

/**
 * MC-16: atomic insert. Counter increments only when a row was actually
 * inserted (i.e. the user hadn't already favorited the listing). Wrapped
 * in a transaction so a failure in either step rolls back both.
 */
export async function addFavoriteAction(listingId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  try {
    await db.transaction(async (tx) => {
      const inserted = await tx.insert(favorites)
        .values({ userId: user.id, listingId })
        .onConflictDoNothing()
        .returning();
      if (inserted.length > 0) {
        await tx.update(listings)
          .set({ favoritesCount: sql`${listings.favoritesCount} + 1` })
          .where(eq(listings.id, listingId));
      }
    });
    return { ok: true };
  } catch (err) {
    console.error('addFavorite', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

export async function removeFavoriteAction(listingId: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  try {
    await db.transaction(async (tx) => {
      const deleted = await tx.delete(favorites)
        .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)))
        .returning();
      if (deleted.length > 0) {
        await tx.update(listings)
          .set({ favoritesCount: sql`GREATEST(${listings.favoritesCount} - 1, 0)` })
          .where(eq(listings.id, listingId));
      }
    });
    return { ok: true };
  } catch (err) {
    console.error('removeFavorite', err);
    return { ok: false };
  }
}

export async function getMyFavoriteIdsAction(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.select({ id: favorites.listingId }).from(favorites).where(eq(favorites.userId, user.id));
  return rows.map((r) => r.id);
}

export async function getMyFavoritesAction(): Promise<(Property & { collectionId: string | null })[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db
    .select({ listing: listings, collectionId: favorites.collectionId })
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .where(and(eq(favorites.userId, user.id), isNull(listings.deletedAt)))
    .orderBy(desc(favorites.createdAt));
  return rows.map((r) => ({ ...rowToProperty(r.listing), collectionId: r.collectionId }));
}

// ============================================================
// Favori koleksiyonları (Tur6 #4b) — sahibinden tarzı sekme/klasör
// ============================================================

export interface FavCollection { id: string; name: string; count: number }

export async function getMyCollectionsAction(): Promise<FavCollection[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db
    .select({
      id: favoriteCollections.id,
      name: favoriteCollections.name,
      count: sql<number>`count(${favorites.listingId})`,
    })
    .from(favoriteCollections)
    .leftJoin(favorites, eq(favorites.collectionId, favoriteCollections.id))
    .where(eq(favoriteCollections.userId, user.id))
    .groupBy(favoriteCollections.id, favoriteCollections.name, favoriteCollections.createdAt)
    .orderBy(favoriteCollections.createdAt);
  return rows.map((r) => ({ id: r.id, name: r.name, count: Number(r.count) }));
}

export async function createCollectionAction(name: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  const clean = sanitizeText(name ?? '', { maxLength: 80 }).trim();
  if (clean.length < 1) return { ok: false, error: 'Sekme adı gerekli.' };
  try {
    const count = await db.select({ c: sql<number>`count(*)` }).from(favoriteCollections).where(eq(favoriteCollections.userId, user.id));
    if (Number(count[0]?.c ?? 0) >= 30) return { ok: false, error: 'En fazla 30 sekme.' };
    const [row] = await db.insert(favoriteCollections).values({ userId: user.id, name: clean }).returning({ id: favoriteCollections.id });
    return { ok: true, id: row.id };
  } catch (err) {
    console.error('createCollection', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

export async function renameCollectionAction(id: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Giriş yapmalısın.' };
  const clean = sanitizeText(name ?? '', { maxLength: 80 }).trim();
  if (clean.length < 1) return { ok: false, error: 'Sekme adı gerekli.' };
  try {
    await db.update(favoriteCollections).set({ name: clean })
      .where(and(eq(favoriteCollections.id, id), eq(favoriteCollections.userId, user.id)));
    return { ok: true };
  } catch (err) {
    console.error('renameCollection', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

export async function deleteCollectionAction(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  try {
    // favorites.collection_id ON DELETE SET NULL → favoriler "Tüm favoriler"e döner
    await db.delete(favoriteCollections).where(and(eq(favoriteCollections.id, id), eq(favoriteCollections.userId, user.id)));
    return { ok: true };
  } catch (err) {
    console.error('deleteCollection', err);
    return { ok: false };
  }
}

/** Bir favoriyi koleksiyona taşı (null = Tüm favoriler). Favori yoksa önce ekler. */
export async function setFavoriteCollectionAction(listingId: string, collectionId: string | null): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  try {
    // Koleksiyonun kullanıcıya ait olduğunu doğrula
    if (collectionId) {
      const [c] = await db.select({ id: favoriteCollections.id }).from(favoriteCollections)
        .where(and(eq(favoriteCollections.id, collectionId), eq(favoriteCollections.userId, user.id))).limit(1);
      if (!c) return { ok: false };
    }
    await db.transaction(async (tx) => {
      const [existing] = await tx.select({ l: favorites.listingId }).from(favorites)
        .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId))).limit(1);
      if (existing) {
        // Zaten favori — sadece koleksiyonu güncelle (sayaç değişmez)
        await tx.update(favorites).set({ collectionId })
          .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)));
      } else {
        // Yeni favori + koleksiyon ataması → sayaç artar
        await tx.insert(favorites).values({ userId: user.id, listingId, collectionId });
        await tx.update(listings).set({ favoritesCount: sql`${listings.favoritesCount} + 1` }).where(eq(listings.id, listingId));
      }
    });
    return { ok: true };
  } catch (err) {
    console.error('setFavoriteCollection', err);
    return { ok: false };
  }
}

/**
 * Toggle. Uses INSERT ... ON CONFLICT DO NOTHING RETURNING to detect whether
 * the row was created in a single atomic operation, preventing both the
 * double-increment race (MC-16) and the SELECT-then-INSERT race.
 */
export async function toggleFavoriteAction(listingId: string): Promise<{ ok: boolean; favorited: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, favorited: false };
  try {
    let favorited = false;
    await db.transaction(async (tx) => {
      const inserted = await tx.insert(favorites)
        .values({ userId: user.id, listingId })
        .onConflictDoNothing()
        .returning();
      if (inserted.length > 0) {
        await tx.update(listings)
          .set({ favoritesCount: sql`${listings.favoritesCount} + 1` })
          .where(eq(listings.id, listingId));
        favorited = true;
      } else {
        const deleted = await tx.delete(favorites)
          .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)))
          .returning();
        if (deleted.length > 0) {
          await tx.update(listings)
            .set({ favoritesCount: sql`GREATEST(${listings.favoritesCount} - 1, 0)` })
            .where(eq(listings.id, listingId));
        }
        favorited = false;
      }
    });
    return { ok: true, favorited };
  } catch (err) {
    console.error('toggleFavorite', err);
    return { ok: false, favorited: false };
  }
}
