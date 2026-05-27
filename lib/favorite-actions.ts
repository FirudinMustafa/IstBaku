'use server';

import { db } from '@/db/client';
import { favorites, listings } from '@/db/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { rowToProperty } from './db-mappers';
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

export async function getMyFavoritesAction(): Promise<Property[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db
    .select({ listing: listings })
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .where(and(eq(favorites.userId, user.id), isNull(listings.deletedAt)))
    .orderBy(desc(favorites.createdAt));
  return rows.map((r) => rowToProperty(r.listing));
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
