'use client';

import * as React from 'react';
import {
  getMyNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from './notification-actions';

// DB-backed bildirim store + client cache + 30s polling.

export interface ClientNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

let cache: ClientNotification[] = [];
let loaded = false;
let inflight: Promise<ClientNotification[]> | null = null;
const listeners = new Set<(items: ClientNotification[]) => void>();

function emit() {
  listeners.forEach((cb) => cb([...cache]));
}

async function loadOnce(force = false): Promise<ClientNotification[]> {
  if (!force && loaded) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const rows = await getMyNotifications();
      cache = rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      }));
      loaded = true;
      emit();
    } catch (err) {
      console.warn('[notifications] load failed', err);
      // Keep cache as-is so UI stays stable
    } finally {
      inflight = null;
    }
    return cache;
  })();
  return inflight;
}

async function markRead(id: string) {
  // Optimistic
  cache = cache.map((n) => (n.id === id ? { ...n, read: true } : n));
  emit();
  await markNotificationReadAction(id);
}

async function markAllRead() {
  cache = cache.map((n) => ({ ...n, read: true }));
  emit();
  await markAllNotificationsReadAction();
}

export const notificationsStore = {
  getAll(): ClientNotification[] {
    return [...cache];
  },
  unreadCount(): number {
    return cache.filter((n) => !n.read).length;
  },
  markRead,
  markAllRead,
  refresh: () => loadOnce(true),
  subscribe(cb: (items: ClientNotification[]) => void): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },
};

/** Hook: DB-backed senkron bildirimleri kullan (30s polling) */
export function useNotifications() {
  const [items, setItems] = React.useState<ClientNotification[]>(() => notificationsStore.getAll());

  React.useEffect(() => {
    const unsub = notificationsStore.subscribe(setItems);
    loadOnce();
    // Background polling
    const t = setInterval(() => loadOnce(true), 30_000);
    // Sekmeye geri dönünce taze çek
    const onVis = () => { if (document.visibilityState === 'visible') loadOnce(true); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      unsub();
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return {
    items,
    unread: items.filter((n) => !n.read).length,
    markRead: notificationsStore.markRead,
    markAllRead: notificationsStore.markAllRead,
    refresh: notificationsStore.refresh,
  };
}
