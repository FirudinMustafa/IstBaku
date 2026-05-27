'use server';

import { db } from '@/db/client';
import { notifications } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';

export async function getMyNotifications() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt));
}

export async function markNotificationReadAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  return { ok: true };
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
  return { ok: true };
}

export async function unreadCountAction(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  const [row] = await db.select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
  return row?.count ?? 0;
}
