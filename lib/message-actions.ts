'use server';

import { db } from '@/db/client';
import { messageThreads, messages, listings, users, notifications } from '@/db/schema';
import { and, or, eq, desc, sql, ne } from 'drizzle-orm';
import { getCurrentUser } from './auth-actions';
import { sendEmail, tplNewMessage, APP_URL } from './email';
import { sanitizeText } from './sanitize';

// postgres-js returns timestamp columns as Date for tracked columns and as
// strings when they come back through a raw sql<Date>``...`` subquery. Normalise.
function toIso(v: Date | string | null | undefined): string {
  if (!v) return new Date(0).toISOString();
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

export interface ThreadSummary {
  id: string;
  listingId: string | null;
  listingTitle: string | null;
  listingSlug: string | null;
  listingCover: string | null;
  otherId: string;
  otherName: string;
  otherAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

export interface MessageRow {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

async function findOrCreateThread(meId: string, otherId: string, listingId: string | null) {
  // Cüt katılımcı (a=küçük uuid, b=büyük uuid) — duplicate'ı engellemek için sıralı tutalım.
  const [a, b] = [meId, otherId].sort();
  const existing = await db.select().from(messageThreads)
    .where(and(
      eq(messageThreads.participantA, a),
      eq(messageThreads.participantB, b),
      listingId ? eq(messageThreads.listingId, listingId) : sql`${messageThreads.listingId} IS NULL`,
    ))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(messageThreads).values({
    participantA: a,
    participantB: b,
    listingId,
  }).returning();
  return created;
}

/**
 * Send a message from current user to `toUserId`. Optionally tied to a listing.
 * Creates the thread if it doesn't exist, writes the message, bumps lastMessageAt,
 * fires a notification for the recipient.
 */
export async function sendMessageAction(input: {
  toUserId: string;
  content: string;
  listingId?: string;
  listingTitle?: string;
}): Promise<{ ok: true; threadId: string } | { ok: false; error: string }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: 'Mesaj göndermek için giriş yap.' };

  // MH-09: sanitize message body before persistence.
  const content = sanitizeText(input.content, { maxLength: 4000 });
  if (content.length < 2) return { ok: false, error: 'Mesaj çok kısa.' };
  if (input.toUserId === me.id) return { ok: false, error: 'Kendine mesaj gönderemezsin.' };

  // Sanitize listingTitle if it ends up in notification body.
  const safeListingTitle = input.listingTitle ? sanitizeText(input.listingTitle, { maxLength: 200 }) : undefined;

  try {
    // Recipient var mı doğrula
    const [other] = await db.select({ id: users.id, name: users.name, email: users.email, status: users.status })
      .from(users).where(eq(users.id, input.toUserId)).limit(1);
    if (!other || other.status === 'suspended') return { ok: false, error: 'Alıcı bulunamadı.' };

    const thread = await findOrCreateThread(me.id, input.toUserId, input.listingId ?? null);

    await db.insert(messages).values({
      threadId: thread.id,
      senderId: me.id,
      content,
    });

    await db.update(messageThreads)
      .set({ lastMessageAt: new Date() })
      .where(eq(messageThreads.id, thread.id));

    // Notification (mesaj alıcısına) — sanitize sender name to avoid stored XSS via display name.
    const safeSenderName = sanitizeText(me.name, { maxLength: 80 });
    const threadUrl = `${APP_URL}/messages?thread=${thread.id}`;
    await db.insert(notifications).values({
      userId: input.toUserId,
      type: 'message',
      title: `${safeSenderName} yeni mesaj gönderdi`,
      body: safeListingTitle ? `"${safeListingTitle}" hakkında: ${content.slice(0, 80)}` : content.slice(0, 120),
      link: `/messages?thread=${thread.id}`,
    });

    // E-posta (alıcıya)
    sendEmail({
      to: other.email,
      subject: `${safeSenderName} sana ISTBAKU üzerinden mesaj gönderdi`,
      html: tplNewMessage({
        recipientName: other.name,
        senderName: safeSenderName,
        snippet: content.slice(0, 240),
        listingTitle: safeListingTitle,
        threadUrl,
      }),
      silent: true,
    }).catch((e) => console.warn('[message mail]', e));

    return { ok: true, threadId: thread.id };
  } catch (err) {
    console.error('sendMessage error', err);
    return { ok: false, error: 'Sunucu hatası.' };
  }
}

/**
 * MH-25: Single-pass query. We join threads → listings → (other user) and
 * pull the last message + unread count via correlated subqueries instead of
 * issuing N+1 round-trips per thread.
 */
export async function getMyThreads(): Promise<ThreadSummary[]> {
  const me = await getCurrentUser();
  if (!me) return [];

  // Compute "other participant id" as: whichever of (a,b) is not me.
  const otherIdExpr = sql<string>`CASE
    WHEN ${messageThreads.participantA} = ${me.id} THEN ${messageThreads.participantB}
    ELSE ${messageThreads.participantA}
  END`;

  const lastMsgExpr = sql<string | null>`(
    SELECT m.content
    FROM ${messages} m
    WHERE m.thread_id = ${messageThreads.id}
    ORDER BY m.created_at DESC
    LIMIT 1
  )`;
  const lastMsgAtExpr = sql<Date | null>`(
    SELECT m.created_at
    FROM ${messages} m
    WHERE m.thread_id = ${messageThreads.id}
    ORDER BY m.created_at DESC
    LIMIT 1
  )`;
  const unreadCountExpr = sql<number>`(
    SELECT COUNT(*)::int
    FROM ${messages} m
    WHERE m.thread_id = ${messageThreads.id}
      AND m.sender_id <> ${me.id}
      AND m.read_at IS NULL
  )`;

  const rows = await db
    .select({
      threadId: messageThreads.id,
      listingId: listings.id,
      listingTitle: listings.title,
      listingSlug: listings.slug,
      listingImages: listings.images,
      otherId: otherIdExpr,
      otherName: users.name,
      otherAvatar: users.avatar,
      lastMessage: lastMsgExpr,
      lastMessageAt: lastMsgAtExpr,
      threadLastMessageAt: messageThreads.lastMessageAt,
      unread: unreadCountExpr,
    })
    .from(messageThreads)
    .leftJoin(listings, eq(messageThreads.listingId, listings.id))
    .innerJoin(users, eq(users.id, otherIdExpr))
    .where(or(eq(messageThreads.participantA, me.id), eq(messageThreads.participantB, me.id)))
    .orderBy(desc(messageThreads.lastMessageAt));

  return rows.map((r) => ({
    id: r.threadId,
    listingId: r.listingId ?? null,
    listingTitle: r.listingTitle ?? null,
    listingSlug: r.listingSlug ?? null,
    listingCover: Array.isArray(r.listingImages) ? (r.listingImages[0] ?? null) : null,
    otherId: r.otherId,
    otherName: r.otherName,
    otherAvatar: r.otherAvatar,
    lastMessage: r.lastMessage ?? '(boş)',
    lastMessageAt: toIso(r.lastMessageAt ?? r.threadLastMessageAt),
    unread: r.unread ?? 0,
  }));
}

export async function getThreadMessages(threadId: string): Promise<MessageRow[]> {
  const me = await getCurrentUser();
  if (!me) return [];
  // Auth: bu thread'in katılımcısı mı?
  const [thread] = await db.select().from(messageThreads).where(eq(messageThreads.id, threadId)).limit(1);
  if (!thread) return [];
  if (thread.participantA !== me.id && thread.participantB !== me.id) return [];

  const rows = await db.select().from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(messages.createdAt);

  return rows.map((m) => ({
    id: m.id,
    threadId: m.threadId,
    senderId: m.senderId,
    content: m.content,
    createdAt: toIso(m.createdAt),
    read: m.readAt != null,
  }));
}

export async function markThreadReadAction(threadId: string): Promise<{ ok: boolean }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false };
  // Verify membership BEFORE mutating — prevents cross-thread poisoning.
  const [thread] = await db.select({ a: messageThreads.participantA, b: messageThreads.participantB })
    .from(messageThreads).where(eq(messageThreads.id, threadId)).limit(1);
  if (!thread) return { ok: false };
  if (thread.a !== me.id && thread.b !== me.id) return { ok: false };

  await db.update(messages).set({ readAt: new Date() })
    .where(and(eq(messages.threadId, threadId), ne(messages.senderId, me.id), sql`${messages.readAt} IS NULL`));
  return { ok: true };
}
